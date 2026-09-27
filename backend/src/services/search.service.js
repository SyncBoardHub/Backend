'use strict';

const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

async function search(userId, q) {
  const query = (q || '').toLowerCase();
  if (!query) return { tasks: [], notes: [] };

  const { data: memberships } = await supabase.from('team_members').select('team_id').eq('user_id', userId);
  if (!memberships || !memberships.length) return { tasks: [], notes: [] };

  const teamIds = memberships.map(m => m.team_id);

  const [{ data: tasks }, { data: notes }] = await Promise.all([
    supabase.from('tasks').select('*').in('team_id', teamIds).or(`title.ilike.%${query}%,description.ilike.%${query}%`),
    supabase.from('notes').select('*').in('team_id', teamIds).or(`title.ilike.%${query}%,content.ilike.%${query}%`)
  ]);

  return { tasks: tasks || [], notes: notes || [] };
}

module.exports = { search };
