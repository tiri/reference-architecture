import React from 'react';

const STYLES = {
  UP:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  DOWN:    'bg-red-100 text-red-700 border-red-200',
  UNKNOWN: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function Badge({ status = 'UNKNOWN' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${STYLES[status] ?? STYLES.UNKNOWN}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'UP'   ? 'bg-emerald-500 animate-pulse' :
        status === 'DOWN' ? 'bg-red-500' : 'bg-slate-400'
      }`} />
      {status}
    </span>
  );
}
