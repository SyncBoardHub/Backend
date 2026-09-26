// Centralized API helper — uses Supabase session token
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const REQUEST_TIMEOUT_MS = 15000;

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

async function fetchWithTimeout(url, options = {}, externalSignal) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortExternal = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  externalSignal?.addEventListener('abort', abortExternal, { once: true });

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw new Error('Unable to reach the SyncBoard API. Start the backend service and try again.');
  } finally {
    window.clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', abortExternal);
  }
}

export async function api(path, method = 'GET', body = null, requestOptions = {}) {
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
    const res = await fetchWithTimeout(apiUrl(path), opts, requestOptions.signal);
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

export async function apiOrThrow(path, method = 'GET', body = null, requestOptions = {}) {
  const token = await getToken();
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetchWithTimeout(apiUrl(path), opts, requestOptions.signal);
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

export async function apiUpload(path, formData, requestOptions = {}) {
  const token = await getToken();
  try {
    const res = await fetchWithTimeout(apiUrl(path), {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    }, requestOptions.signal);
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

export async function apiDownload(path, requestOptions = {}) {
  const token = await getToken();
  const res = await fetchWithTimeout(apiUrl(path), {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  }, requestOptions.signal);
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
