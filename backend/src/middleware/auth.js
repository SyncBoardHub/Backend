'use strict';

const { supabase, supabaseAuth } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Authentication middleware.
 * Validates the Bearer token from the Authorization header using Supabase Auth,
 * then loads the user's profile from the DB and attaches it to req.user.
 * Auto-creates a profile if one doesn't exist yet (covers OAuth sign-up flows).
 */
async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Load profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Auto-create profile for OAuth/social signups
    if (!profile) {
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0];
      const avatar = name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          user_id: user.id.substring(0, 8),
          name,
          email: user.email,
          avatar
        })
        .select()
        .single();

      if (createError) {
        logger.error({ err: createError.message, userId: user.id }, 'Auto-create profile error');
        return res.status(500).json({ error: 'Failed to create profile' });
      }
      profile = newProfile;
    }

    req.user = {
      id: profile.id,
      userId: profile.user_id,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar
    };

    next();
  } catch (err) {
    logger.warn({ err: err.message, requestId: res.locals.requestId }, 'Auth middleware error');
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = auth;
