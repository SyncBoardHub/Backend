// Centralized API helper — uses Supabase session token
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return null;
}

export async function api(path, method = 'GET', body = null) {
  const token = await getToken();
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(apiUrl(path), opts);
    if (res.status === 401) {
      await supabase.auth.signOut();
      return null;
    }
    return parseResponse(res);
  } catch (err) {
    console.error('API fetch error:', err);
    return null;
  }
}

export async function apiOrThrow(path, method = 'GET', body = null) {
  const token = await getToken();
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(apiUrl(path), opts);
  const data = await parseResponse(res);

  if (res.status === 401) {
    await supabase.auth.signOut();
  }

  if (!res.ok) {
    const error = new Error(data?.error || 'Request failed');
    error.status = res.status;
    error.code = data?.code || 'REQUEST_FAILED';
    error.details = data;
    throw error;
  }

  return data;
}

export async function apiUpload(path, formData) {
  const token = await getToken();
  try {
    const res = await fetch(apiUrl(path), {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (res.status === 401) {
      await supabase.auth.signOut();
      return null;
    }
    return res.json();
  } catch (err) {
    console.error('API upload error:', err);
    return null;
  }
}

export async function apiDownload(path) {
  const token = await getToken();
  const res = await fetch(apiUrl(path), {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Download failed');
  const disposition = res.headers.get('content-disposition');
  let filename = 'download';
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match) filename = match[1];
  }
  const blob = await res.blob();
  return { blob, filename };
}
