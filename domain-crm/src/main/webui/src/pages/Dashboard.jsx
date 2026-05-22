import React, { useEffect, useState } from 'react';
import { StatCard, Card } from 'portal/UI';

// ── Helpers ───────────────────────────────────────────────────────────────────

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const STATUS_STYLES = {
  active:   'bg-emerald-100 text-emerald-700 border border-emerald-200',
  inactive: 'bg-slate-100  text-slate-500  border border-slate-200',
  prospect: 'bg-amber-100  text-amber-700  border border-amber-200',
};

function StatusPill({ status }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize tracking-wide ${STATUS_STYLES[status] ?? ''}`}>
      {status}
    </span>
  );
}

function SortIcon({ field, sort, order }) {
  if (sort !== field) return <span className="ml-1 opacity-30 text-xs">↕</span>;
  return <span className="ml-1 text-primary text-xs">{order === 'asc' ? '↑' : '↓'}</span>;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {[140, 180, 100, 60, 70, 80].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-4 rounded bg-slate-100 animate-pulse`} style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'name',     label: 'Customer',  sortable: true  },
  { key: 'email',    label: 'Email',     sortable: true  },
  { key: 'industry', label: 'Industry',  sortable: true  },
  { key: 'country',  label: 'Country',   sortable: true  },
  { key: 'status',   label: 'Status',    sortable: true  },
  { key: 'revenue',  label: 'Revenue',   sortable: true, align: 'right' },
];

const PAGE_SIZE = 8;

function CustomerTable({ org }) {
  const [page,    setPage]   = useState(0);
  const [sort,    setSort]   = useState('name');
  const [order,   setOrder]  = useState('asc');
  const [search,  setSearch] = useState('');
  const [status,  setStatus] = useState('all');
  const [data,    setData]   = useState(null);
  const [loading, setLoading]= useState(true);

  const q = useDebounce(search, 300);

  useEffect(() => { setPage(0); }, [q, status, sort, order]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, size: PAGE_SIZE, sort, order });
    if (q)              params.set('search', q);
    if (status !== 'all') params.set('status', status);
    if (org)            params.set('org', org);

    fetch(`/api/crm/customers?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, sort, order, q, status, org]);

  const toggleSort = col => {
    if (sort === col) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setOrder('asc'); }
  };

  const totalPages = data?.totalPages ?? 1;
  const from = data ? page * PAGE_SIZE + 1 : 0;
  const to   = data ? Math.min((page + 1) * PAGE_SIZE, data.total) : 0;

  return (
    <Card className="overflow-hidden">

      {/* Controls */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center gap-3 bg-white">
        <h2 className="text-sm font-semibold text-slate-700 mr-auto flex items-center gap-2">
          Customers
          {loading && data && (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-primary animate-spin inline-block" />
          )}
        </h2>

        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 w-44 transition-colors"
          />
        </div>

        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="py-1.5 px-3 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="prospect">Prospect</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && toggleSort(col.key)}
                  className={`px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap select-none
                    ${col.align === 'right' ? 'text-right' : 'text-left'}
                    ${col.sortable ? 'cursor-pointer hover:text-slate-700 hover:bg-slate-100 transition-colors' : ''}`}
                >
                  {col.label}<SortIcon field={col.key} sort={sort} order={order} />
                </th>
              ))}
            </tr>
          </thead>

          <tbody className={`divide-y divide-slate-100 transition-opacity duration-150 ${loading && data ? 'opacity-50' : 'opacity-100'}`}>
            {/* Skeleton only on the very first load — prevents scroll-to-top on re-fetches */}
            {!data && Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonRow key={i} />)}

            {data?.items?.length === 0 && !loading && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-slate-400">
                  No customers match your search.
                </td>
              </tr>
            )}

            {(data?.items ?? []).map(c => (
              <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">

                {/* Name + avatar */}
                <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 group-hover:bg-primary/20 transition-colors">
                      {c.name.charAt(0)}
                    </div>
                    {c.name}
                  </div>
                </td>

                <td className="px-4 py-3 text-slate-400 text-xs font-mono max-w-[160px] truncate">{c.email}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.industry}</td>

                {/* Country flag emoji */}
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  <span className="mr-1">{countryFlag(c.country)}</span>{c.country}
                </td>

                <td className="px-4 py-3"><StatusPill status={c.status} /></td>

                <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                  {c.revenue > 0 ? `€${c.revenue.toLocaleString()}` : <span className="text-slate-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <span className="text-xs text-slate-400">
          {data?.total > 0 ? `${from}–${to} of ${data.total}` : 'No results'}
        </span>

        <div className="flex items-center gap-1">
          <PageButton onClick={() => setPage(p => p - 1)} disabled={page === 0}>‹</PageButton>
          {Array.from({ length: totalPages }, (_, i) => (
            <PageButton key={i} onClick={() => setPage(i)} active={i === page}>{i + 1}</PageButton>
          ))}
          <PageButton onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>›</PageButton>
        </div>
      </div>
    </Card>
  );
}

function PageButton({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[30px] h-7 px-2 rounded-md text-xs font-medium border transition-colors
        ${active
          ? 'bg-primary text-white border-primary shadow-sm'
          : 'border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed'
        }`}
    >
      {children}
    </button>
  );
}

function countryFlag(code) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)));
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CrmDashboard({ org }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const q = org ? `?org=${encodeURIComponent(org)}` : '';
    fetch(`/api/crm/dashboard${q}`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => null);
  }, [org]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">CRM</h1>
        {org && <p className="mt-1 text-sm text-slate-500">Organisation: <span className="font-medium text-slate-700">{org}</span></p>}
      </div>

      {data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Active customers" value={data.customers} />
          <StatCard label="Prospects"        value={data.leads} />
          <StatCard label="Open tasks"       value={data.tasks} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      )}

      <CustomerTable org={org} />
    </div>
  );
}
