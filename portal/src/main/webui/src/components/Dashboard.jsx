import React, { useEffect, useState } from 'react';
import DomainCard from './DomainCard';
import Skeleton from './ui/Skeleton';

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="mt-2 pt-3 border-t border-slate-100 flex justify-between">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-14" />
      </div>
    </div>
  );
}

// apps list and status are fetched separately:
//   /api/portal/apps   — fast, renders cards immediately
//   /api/portal/status — slower (calls domain health/info), updates badges
export default function Dashboard({ apps, org }) {
  const [statuses, setStatuses] = useState({});

  const loadStatuses = () =>
    fetch('/api/portal/status')
      .then(r => r.ok ? r.json() : [])
      .then(list => setStatuses(Object.fromEntries(list.map(s => [s.id, s]))))
      .catch(() => {});

  useEffect(() => {
    if (apps.length === 0) return;
    loadStatuses();
    const id = setInterval(loadStatuses, 30_000);
    return () => clearInterval(id);
  }, [apps]);

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Application Portal</h1>
        <p className="mt-1 text-slate-500">
          Viewing <span className="font-medium text-slate-700">{org?.value}</span> — select a domain to open it.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {apps.length === 0
          ? [1, 2, 3].map(i => <CardSkeleton key={i} />)
          : apps.map(app => (
              <DomainCard key={app.id} {...app} {...(statuses[app.id] ?? {})} />
            ))
        }
      </div>
    </div>
  );
}
