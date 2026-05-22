import React from 'react';

export default function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
      <div className="text-3xl font-bold text-primary tabular-nums">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</div>
    </div>
  );
}
