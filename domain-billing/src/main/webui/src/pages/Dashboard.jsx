import React, { useEffect, useState } from 'react';
import { StatCard, Card, Badge } from 'portal/UI';

const MOCK_INVOICES = [
  { id: 'INV-001', customer: 'Acme Corp', amount: '€1,200', status: 'paid'    },
  { id: 'INV-002', customer: 'Globex',    amount: '€3,400', status: 'pending' },
  { id: 'INV-003', customer: 'Initech',   amount: '€890',   status: 'overdue' },
];

const STATUS_STYLES = {
  paid:    'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100  text-amber-700',
  overdue: 'bg-red-100    text-red-700',
};

function InvoiceStatusPill({ status }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? ''}`}>
      {status}
    </span>
  );
}

export default function BillingDashboard({ org }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const q = org ? `?org=${encodeURIComponent(org)}` : '';
    fetch(`/api/billing/dashboard${q}`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => null);
  }, [org]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Billing</h1>
        {org && (
          <p className="mt-1 text-sm text-slate-500">
            Organisation: <span className="font-medium text-slate-700">{org}</span>
          </p>
        )}
      </div>

      {/* Stats */}
      {data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Invoices"    value={data.invoices} />
          <StatCard label="Outstanding" value={data.outstanding} />
          <StatCard label="Revenue"     value={`€${data.revenue?.toLocaleString()}`} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      )}

      {/* Invoice list */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Invoices</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {MOCK_INVOICES.map(inv => (
            <li key={inv.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                  {inv.id}
                </span>
                <span className="text-sm font-medium text-slate-800">{inv.customer}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-slate-700 tabular-nums">{inv.amount}</span>
                <InvoiceStatusPill status={inv.status} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
