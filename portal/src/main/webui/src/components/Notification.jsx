import React, { useEffect, useRef, useState } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function accentClass(status) {
  if (!status)       return 'bg-slate-400';
  if (status === 401) return 'bg-amber-400';
  if (status < 500)  return 'bg-orange-400';
  return 'bg-red-500';
}

function defaultMessage(status) {
  if (!status)       return 'Could not reach the server. Check your connection.';
  if (status === 400) return 'The request was invalid.';
  if (status === 401) return 'Your session has expired or you are not authorised.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The requested resource was not found.';
  if (status === 408) return 'The request timed out.';
  if (status === 409) return 'A conflict occurred. The resource may have changed.';
  if (status === 422) return 'The server could not process the request.';
  if (status === 429) return 'Too many requests — please wait a moment.';
  if (status >= 500)  return 'Something went wrong on the server.';
  return `Request failed.`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Notification() {
  const [visible,  setVisible]  = useState(false);
  const [mounted,  setMounted]  = useState(false);
  const [detail,   setDetail]   = useState({ status: 0, message: null });
  const hideTimer = useRef(null);

  useEffect(() => {
    const show = (e) => {
      clearTimeout(hideTimer.current);
      setDetail(e.detail ?? {});
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      // Auto-dismiss after 8 s for non-auth errors
      if (e.detail?.status !== 401) {
        hideTimer.current = setTimeout(dismiss, 8_000);
      }
    };

    window.addEventListener('portal:notification', show);
    return () => {
      window.removeEventListener('portal:notification', show);
      clearTimeout(hideTimer.current);
    };
  }, []);

  const dismiss = () => {
    clearTimeout(hideTimer.current);
    setVisible(false);
    setTimeout(() => setMounted(false), 300);
  };

  if (!mounted) return null;

  const { status, message } = detail;
  const label = status ? `${status}` : 'Network error';
  const body  = message ?? defaultMessage(status);
  const show401Button = status === 401;

  return (
    <div
      role="alert"
      className={`fixed bottom-5 right-5 z-50 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl
        transform transition-all duration-300 ease-out
        ${visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 pointer-events-none'}`}
    >
      {/* Status colour bar */}
      <div className={`h-1 rounded-t-2xl ${accentClass(status)}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
              {label}
            </span>
            <p className="font-semibold text-slate-800 text-sm">
              {show401Button ? 'Authentication required' : 'Request failed'}
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">{body}</p>

        <div className="flex gap-2">
          {show401Button && (
            <a
              href="/"
              className="flex-1 text-center bg-primary text-white text-sm font-medium py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
            >
              Sign in again
            </a>
          )}
          <button
            onClick={dismiss}
            className={`text-sm font-medium text-slate-500 py-2 px-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors ${!show401Button ? 'flex-1' : ''}`}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
