'use client';

import React from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';

interface PipelineColumn {
  title: string;
  count: number;
  total: string;
  items: Array<{
    id: string;
    customer: string;
    amount: string;
  }>;
}

const COLUMNS: PipelineColumn[] = [
  {
    title: 'Draft',
    count: 1,
    total: '$12,400',
    items: [{ id: 'Q-1041', customer: 'Acme Corp', amount: '$12,400' }],
  },
  {
    title: 'Pending Approval',
    count: 1,
    total: '$29,700',
    items: [{ id: 'Q-1042', customer: 'Beta Industries', amount: '$29,700' }],
  },
  {
    title: 'Approved',
    count: 1,
    total: '$5,750',
    items: [{ id: 'Q-1035', customer: 'Nova Retail', amount: '$5,750' }],
  },
  {
    title: 'Negotiation',
    count: 1,
    total: '$72,300',
    items: [{ id: 'Q-1033', customer: 'Zenith Co', amount: '$72,300' }],
  },
  {
    title: 'Confirmed',
    count: 1,
    total: '$41,000',
    items: [{ id: 'Q-1030', customer: 'Omicron Ltd', amount: '$41,000' }],
  },
];

export default function QuotationsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-7xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Quotations (List)</h1>
            <p className="text-xs text-gray-400 mt-1">
              Every quotation in the system; click any row to open it.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/quotations/new"
              className="px-3 py-1.5 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition"
            >
              + New Quotation
            </Link>
            <button className="px-3 py-1.5 rounded text-xs font-medium border border-[#333] text-gray-300 hover:bg-[#1a1a1a] transition">
              Switch to Table View
            </button>
          </div>
        </div>

        {/* Kanban Board matching Screen 3 in PNG */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {COLUMNS.map((col) => (
            <div key={col.title} className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3 flex flex-col space-y-3 min-h-[360px]">
              <div className="border-b border-[#222] pb-2">
                <div className="text-xs font-semibold text-white">{col.title}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{col.items.length} quotations • {col.total}</div>
              </div>
              <div className="space-y-2 flex-1">
                {col.items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/quotations/${item.id}`}
                    className="block p-3 rounded border border-[#262626] bg-[#141414] hover:border-gray-500 transition cursor-pointer"
                  >
                    <div className="text-xs font-mono font-semibold text-white">{item.id}</div>
                    <div className="text-xs text-gray-300 mt-1">{item.customer}</div>
                    <div className="text-xs font-mono text-gray-400 mt-1">{item.amount}</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
