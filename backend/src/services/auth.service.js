'use strict';

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { supabase, supabaseAuth, supabaseAdmin } = require('../config/supabase');
const env = require('../config/env');
const { sanitize } = require('../utils/sanitize');
const { INVITE_ALPHABET, INVITE_CODE_LENGTH } = require('../constants');
const logger = require('../utils/logger');

function generateInviteCode() {
  return Array.from(
    { length: INVITE_CODE_LENGTH },
    () => INVITE_ALPHABET[crypto.randomInt(0, INVITE_ALPHABET.length)]
  ).join('');
}

function normalizeInviteCode(value) {
  const code = sanitize(value || '').toUpperCase();
  return /^[A-Z0-9]{8,16}$/.test(code) ? code : null;
}

async function register({ userId, name, email, password, acceptedPolicies }) {
  email = sanitize(email);
  name = sanitize(name);
  userId = sanitize(userId);

  if (!email || !password || !name) throw Object.assign(new Error('All fields are required'), { status: 400 });
  if (password.length < 6) throw Object.assign(new Error('Password must be at least 6 characters'), { status: 400 });
  if (acceptedPolicies !== true) {
    throw Object.assign(new Error('You must accept the Terms and acknowledge the Privacy Policy to create an account.'), { status: 400 });
  }

  // Check if userId is taken
  if (userId) {
    const { data: existing } = await supabase.from('profiles').select('id').eq('user_id', userId).single();
    if (existing) {
      const { data: authCheck } = supabaseAdmin
        ? await supabaseAdmin.auth.admin.getUserById(existing.id)
        : { data: null };
      if (authCheck?.user || !supabaseAdmin) {
        throw Object.assign(new Error('User ID already taken'), { status: 400 });
      }
      // Orphan cleanup
      await supabase.from('team_members').delete().eq('user_id', existing.id);
      await supabase.from('profiles').delete().eq('id', existing.id);
    }
  }

  // Email orphan check
  const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', email).single();
  if (existingProfile) {
    const { data: authCheck } = supabaseAdmin
      ? await supabaseAdmin.auth.admin.getUserById(existingProfile.id)
      : { data: null };
    if (authCheck?.user || !supabaseAdmin) {
      throw Object.assign(new Error('Email already registered. Try logging in instead.'), { status: 400 });
    }
    await supabase.from('team_members').delete().eq('user_id', existingProfile.id);
    await supabase.from('profiles').delete().eq('id', existingProfile.id);
  }

  // Ghost auth user cleanup
  if (supabaseAdmin) {
    try {
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const ghostUser = userList?.users?.find(u => u.email === email);
      if (ghostUser) {
        const { data: profileCheck } = await supabase.from('profiles').select('id').eq('id', ghostUser.id).single();
        if (!profileCheck) await supabaseAdmin.auth.admin.deleteUser(ghostUser.id);
      }
    } catch (e) {
      logger.warn({ err: e.message }, 'Ghost user cleanup skipped');
    }
  }

  const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: { data: { name, user_id: userId } }
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw Object.assign(new Error('Email already registered. Try logging in or use a different email.'), { status: 400 });
    }
    throw Object.assign(new Error(authError.message), { status: 400 });
  }

  const authUser = authData.user;
  if (!authUser) throw Object.assign(new Error('Registration failed'), { status: 500 });

  const avatar = name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
  const finalUserId = userId || authUser.id.substring(0, 8);

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authUser.id,
    user_id: finalUserId,
    name,
    email,
    avatar,
    terms_accepted_at: new Date().toISOString(),
    privacy_acknowledged_at: new Date().toISOString(),
    legal_policy_version: env.LEGAL_POLICY_VERSION
  }, { onConflict: 'id' });

  if (profileError) {
    logger.error({ err: profileError.message }, 'Profile creation error');
    throw Object.assign(new Error('Failed to create profile'), { status: 500 });
  }

  const token = authData.session?.access_token;
  return {
    token: token || '',
    user: { id: authUser.id, userId: finalUserId, name, email, avatar },
    ...(token ? {} : { message: 'Account created. Check your email for confirmation if auto-login fails.' })
  };
}

async function login({ email, password }) {
  if (!email || !password) throw Object.assign(new Error('Email and password required'), { status: 400 });

  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: sanitize(email),
    password
  });

  if (error) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
  if (!profile) throw Object.assign(new Error('Profile not found. Please register again.'), { status: 401 });

  return {
    token: data.session.access_token,
    user: { id: profile.id, userId: profile.user_id, name: profile.name, email: profile.email, avatar: profile.avatar }
  };
}

async function forgotPassword({ email, frontendUrl }) {
  if (!email) throw Object.assign(new Error('Email is required'), { status: 400 });
  const { error } = await supabaseAuth.auth.resetPasswordForEmail(sanitize(email), {
    redirectTo: `${frontendUrl}/reset-password`
  });
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  return { message: 'Password reset email sent! Check your inbox.' };
}

async function resetPassword({ access_token, password }) {
  if (!access_token || !password) throw Object.assign(new Error('Token and new password are required'), { status: 400 });
  if (password.length < 6) throw Object.assign(new Error('Password must be at least 6 characters'), { status: 400 });

  const tempClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${access_token}` } }
  });
  const { error } = await tempClient.auth.updateUser({ password });
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  return { message: 'Password updated successfully! You can now log in.' };
}

module.exports = { register, login, forgotPassword, resetPassword, generateInviteCode, normalizeInviteCode };
