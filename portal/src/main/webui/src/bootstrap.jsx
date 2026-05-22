import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// ── Global fetch error interceptor ───────────────────────────────────────────
// Dispatches 'portal:notification' for every failed request (status >= 400 or
// network error). Any code — portal or embedded domain app — can dispatch the
// same event to show a notification without importing any module.
//
// checkSession uses the original _fetch so it bypasses this interceptor and
// can do a hard redirect when the Quarkus session is definitively gone.

const _fetch = window.fetch.bind(window);
let cooldown = false;

function dispatch(status) {
  if (cooldown) return;
  cooldown = true;
  window.dispatchEvent(new CustomEvent('portal:notification', { detail: { status } }));
  setTimeout(() => { cooldown = false; }, 10_000);
}

window.fetch = async (...args) => {
  try {
    const res = await _fetch(...args);
    if (res.status >= 400) dispatch(res.status);
    return res;
  } catch (err) {
    dispatch(0);
    throw err;
  }
};

const checkSession = () =>
  _fetch('/api/portal/user')
    .then(r => { if (r.status === 401) window.location.href = '/'; })
    .catch(() => {});

setInterval(checkSession, 60_000);

// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')).render(<App />);
