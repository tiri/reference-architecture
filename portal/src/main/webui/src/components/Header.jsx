import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Header({ user, apps, orgs, selectedOrg, onOrgChange }) {
  const { pathname } = useLocation();
  const segment      = pathname.split('/').filter(Boolean)[0];
  const currentApp   = apps.find(a => a.id === segment && a.id !== 'portal');
  const initial      = user?.name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <header className="bg-primary-dark text-white sticky top-0 z-50 shadow-lg">
      <nav className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-3">

        {/* Brand + breadcrumb */}
        <div className="flex items-center gap-2 mr-auto min-w-0">
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-base shrink-0 hover:text-white/80 transition-colors">
            <span className="text-primary-light">◇</span> Portal
          </Link>
          {currentApp && (
            <>
              <span className="text-white/30 select-none">/</span>
              <span className="text-white/70 font-medium text-sm truncate">{currentApp.name}</span>
            </>
          )}
        </div>

        {/* Org switcher */}
        <select
          value={selectedOrg?.key ?? ''}
          onChange={e => onOrgChange(orgs.find(o => o.key === e.target.value) ?? orgs[0])}
          aria-label="Select organisation"
          className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/40 hover:bg-white/20 transition-colors max-w-[150px]"
        >
          {orgs.map(org => <option key={org.key} value={org.key} className="bg-slate-800 text-white">{org.value}</option>)}
        </select>

        {/* User */}
        {user && (
          <div className="flex items-center gap-3 shrink-0 pl-2 border-l border-white/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-sm select-none text-white">
                {initial}
              </div>
              <span className="text-sm text-white/80 hidden sm:block">{user.name}</span>
            </div>
            <a href="/logout" className="text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-white/90 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
              Sign out
            </a>
          </div>
        )}
      </nav>
    </header>
  );
}
