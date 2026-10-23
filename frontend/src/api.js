import { useEffect, useState } from 'react';

export const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '').replace(/\/api$/, '');
export const API_URL = `${API_ORIGIN}/api`;

// Uploaded files are stored as "/uploads/..." on the API server.
export const assetUrl = (url) => (!url ? '' : url.startsWith('/uploads/') ? `${API_ORIGIN}${url}` : url);

export function makeApi(token) {
  const headers = (extra = {}) => ({ ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra });
  const fail = async (response) => {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.message || 'Something went wrong. Please try again.');
    error.status = response.status;
    throw error;
  };

  const api = async (path, options = {}) => {
    const { body, ...rest } = options;
    const response = await fetch(`${API_URL}${path}`, { ...rest, headers: headers({ 'Content-Type': 'application/json' }), body: body === undefined ? undefined : JSON.stringify(body) });
    if (!response.ok) await fail(response);
    return response.json().catch(() => ({}));
  };
  api.upload = async (file) => {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${API_URL}/uploads`, { method: 'POST', headers: headers(), body: form });
    if (!response.ok) await fail(response);
    return response.json();
  };
  api.download = async (path, filename) => {
    const response = await fetch(`${API_URL}${path}`, { headers: headers() });
    if (!response.ok) await fail(response);
    const url = URL.createObjectURL(await response.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  return api;
}

// Loads `path` and reloads it whenever `live` changes (bumped by real-time events) or reload() is called.
export function useFetch(api, path, live = 0) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!path) return undefined;
    let alive = true;
    api(path)
      .then((data) => alive && setState({ data, error: '', loading: false }))
      .catch((error) => alive && setState((s) => ({ ...s, error: error.message, loading: false })));
    return () => { alive = false; };
  }, [api, path, live, version]);
  return { data: path ? state.data : null, error: state.error, loading: path ? state.loading : false, reload: () => setVersion((v) => v + 1) };
}

export const fmt = (d, opts = { dateStyle: 'medium', timeStyle: 'short' }) => (d ? new Date(d).toLocaleString(undefined, opts) : '');
export const toLocalInput = (d) => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
