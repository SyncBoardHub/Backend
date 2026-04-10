// Centralized API helper — mirrors the old vanilla `api()` function
const API_BASE = import.meta.env.VITE_API_URL || '';

export async function api(path, method = 'GET', body = null) {
  const token = localStorage.getItem('ts_token');
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 401) {
    localStorage.removeItem('ts_token');
    localStorage.removeItem('ts_user');
    window.location.href = '/login';
    return null;
  }
  return res.json();
}

export async function apiUpload(path, formData) {
  const token = localStorage.getItem('ts_token');
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  if (res.status === 401) {
    localStorage.removeItem('ts_token');
    localStorage.removeItem('ts_user');
    window.location.href = '/login';
    return null;
  }
  return res.json();
}

export async function apiDownload(path) {
  const token = localStorage.getItem('ts_token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Authorization': `Bearer ${token}` },
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
