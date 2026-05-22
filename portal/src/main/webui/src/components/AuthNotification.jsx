import React, { useEffect, useState } from 'react';

const CONFIGS = {
  auth: {
    accent:  'bg-amber-400',
    icon:    '⚠',
    color:   'text-amber-500',
    title:   'Authentication required',
    body:    'Your session has expired or the request was not authorised.',
    action:  { label: 'Sign in again', href: '/' },
  },
  server: {
    accent:  'bg-red-400',
    icon:    '✕',
    color:   'text-red-500',
    title:   'Server error',
    body:    'Something went wrong on the server. Please try again in a moment.',
    action:  null,
  },
  network: {
    accent:  'bg-slate-400',
    icon:    '⊗',
    color:   'text-slate-500',
    title:   'Connection problem',
    body:    'Could not reach the server. Check your connection and try again.',
    action:  null,
  },
};

function typeFromStatus(status) {
  if (status === 401)       return 'auth';
  if (status >= 500)        return 'server';
  return 'network';
}

export default function AuthNotification() {
  const [visible,  setVisible]  = useState(false);
  const [mounted,  setMounted]  = useState(false);
  const [config,   setConfig]   = useState(CONFIGS.auth);

  useEffect(() => {
    const show = (e) => {
      const status = e.detail?.status ?? 0;
      setConfig(CONFIGS[typeFromStatus(status)]);
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    };

    window.addEventListener('portal:request-error', show);
    return () => window.removeEventListener('portal:request-error', show);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => setMounted(false), 300);
  };

  if (!mounted) return null;

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl
        transform transition-all duration-300 ease-out
        ${visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 pointer-events-none'}`}
    >
      <div className={`h-1 rounded-t-2xl ${config.accent}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-lg leading-none ${config.color}`}>{config.icon}</span>
            <p className="font-semibold text-slate-800 text-sm">{config.title}</p>
          </div>
          <button
            onClick={dismiss}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">{config.body}</p>

        <div className="flex gap-2">
          {config.action && (
            <a
              href={config.action.href}
              className="flex-1 text-center bg-primary text-white text-sm font-medium py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
            >
              {config.action.label}
            </a>
          )}
          <button
            onClick={dismiss}
            className={`text-sm font-medium text-slate-500 py-2 px-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors ${config.action ? '' : 'flex-1'}`}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
