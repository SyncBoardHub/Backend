'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/teamAccess');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { sanitize } = require('../utils/sanitize');
const logger = require('../utils/logger');

// POST /api/admin/cleanup-ghosts
router.post('/cleanup-ghosts', auth, requireAdmin, async (req, res, next) => {
  try {
    const { data: profiles } = await supabase.from('profiles').select('id, email, name');
    if (!profiles) return res.json({ cleaned: 0 });

    let cleaned = 0;
    for (const profile of profiles) {
      try {
        const { data: authCheck } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        if (!authCheck?.user) {
          await supabase.from('team_members').delete().eq('user_id', profile.id);
          await supabase.from('profiles').delete().eq('id', profile.id);
          cleaned++;
          logger.info({ profileId: profile.id, email: profile.email }, 'Cleaned ghost profile');
        }
      } catch (e) {
        await supabase.from('team_members').delete().eq('user_id', profile.id);
        await supabase.from('profiles').delete().eq('id', profile.id);
        cleaned++;
      }
    }

    res.json({ success: true, cleaned, total: profiles.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/delete-user
router.post('/delete-user', auth, requireAdmin, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const cleanEmail = sanitize(email);
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .single();

    if (profile) {
      await supabase.from('team_members').delete().eq('user_id', profile.id);
      await supabase.from('tasks').update({ assignee_id: null }).eq('assignee_id', profile.id);
      await supabase.from('profiles').delete().eq('id', profile.id);

      try {
        await supabaseAdmin.auth.admin.deleteUser(profile.id);
      } catch (e) {
        logger.warn({ err: e.message }, 'Auth user deletion skipped');
      }

      return res.json({ success: true, message: `User ${cleanEmail} fully deleted` });
    }

    if (supabaseAdmin) {
      try {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const authUser = userList?.users?.find(u => u.email === cleanEmail);
        if (authUser) {
          await supabaseAdmin.auth.admin.deleteUser(authUser.id);
          return res.json({ success: true, message: `Auth ghost user ${cleanEmail} deleted` });
        }
      } catch (e) {
        logger.warn({ err: e.message }, 'Auth search failed');
      }
    }

    return res.status(404).json({ error: 'User not found' });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/reset-all
router.post('/reset-all', auth, requireAdmin, async (req, res, next) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'RESET_EVERYTHING') {
      return res.status(400).json({ error: 'Send { confirm: "RESET_EVERYTHING" } to confirm' });
    }

    await supabase.from('files').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('notes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('team_members').delete().neq('team_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    res.json({ success: true, message: 'All project data has been cleared.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
