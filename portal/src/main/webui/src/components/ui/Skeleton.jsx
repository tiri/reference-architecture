import React from 'react';

export default function Skeleton({ className = '' }) {
  return (
    <div
      className={`rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:800px_100%] animate-shimmer ${className}`}
    />
  );
}
