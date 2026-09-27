'use strict';

const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

/**
 * supabaseAuth  – uses the anon key for user-facing Auth operations (login, signUp, getUser)
 * supabase      – uses the service role key for all DB operations (bypasses RLS; server-only)
 * supabaseAdmin – alias for supabase when service role is available; used for Storage and Auth admin ops
 */
const supabaseAuth = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY
);

const supabaseAdmin = env.SUPABASE_SERVICE_ROLE_KEY ? supabase : null;

module.exports = { supabase, supabaseAuth, supabaseAdmin };
