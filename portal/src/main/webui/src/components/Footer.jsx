import React, { useEffect, useState } from 'react';

export default function Footer() {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    fetch('/q/info')
      .then(r => r.ok ? r.json() : null)
      .then(d => setVersion(d?.build?.version ?? null))
      .catch(() => null);
  }, []);

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-6 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-medium text-slate-500">
          <span className="text-blue-500">◇</span> Reference Architecture
        </span>
        {version && (
          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono">
            v{version}
          </span>
        )}
        <div className="ml-auto flex items-center gap-4">
          <a href="/q/health" target="_blank" rel="noreferrer" className="hover:text-slate-600 transition-colors">Health</a>
          <a href="/q/info"   target="_blank" rel="noreferrer" className="hover:text-slate-600 transition-colors">Info</a>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
