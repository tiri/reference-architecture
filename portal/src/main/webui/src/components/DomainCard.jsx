import React from 'react';
import { Link } from 'react-router-dom';
import Badge from './ui/Badge';

function CardInner({ name, description, status, version }) {
  return (
    <>
      <div className="flex items-start justify-between mb-3 gap-2">
        <h3 className="font-semibold text-slate-800 text-base leading-snug">{name}</h3>
        <Badge status={status ?? 'UNKNOWN'} />
      </div>
      <p className="text-sm text-slate-500 flex-1 leading-relaxed">{description}</p>
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
          {version || '—'}
        </span>
        <span className="text-primary text-sm font-medium">Open →</span>
      </div>
    </>
  );
}

export default function DomainCard({ id, name, description, status, version }) {
  const base = 'bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col transition-all duration-200';

  // Portal card is non-navigable (clicking it re-renders the same page)
  if (id === 'portal') {
    return (
      <div className={`${base} opacity-75`}>
        <CardInner name={name} description={description} status={status} version={version} />
      </div>
    );
  }

  return (
    <Link
      to={`/${id}`}
      className={`${base} hover:shadow-xl hover:-translate-y-1 hover:border-primary-light group cursor-pointer`}
    >
      <CardInner name={name} description={description} status={status} version={version} />
    </Link>
  );
}
