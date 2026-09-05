'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { useAuth } from '@/lib/auth-context';
import { getAuthHeaders, API_BASE_URL } from '@/lib/api-client';

interface QuoteRecord {
  id: string;
  quoteNumber: string;
  status: string;
  totalAmount: string;
  customerName: string;
  customerCompany: string;
  customerTier: string;
  repName: string;
  createdAt: string;
}

interface ColumnDef {
  key: string;
  title: string;
  statuses: string[];
}

const COLUMNS_DEF: ColumnDef[] = [
  { key: 'draft', title: 'Draft', statuses: ['draft'] },
  { key: 'sent', title: 'Sent to Customer', statuses: ['sent'] },
  { key: 'negotiation', title: 'Negotiation', statuses: ['under_negotiation', 'negotiation'] },
  { key: 'pending', title: 'Governance Approval', statuses: ['pending_approval'] },
  { key: 'confirmed', title: 'Confirmed / Ready', statuses: ['confirmed', 'approved', 'fulfilled'] },
];

export default function QuotationsPage() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/sales/quotes`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setQuotes(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [user]);

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-7xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Quotations Pipeline</h1>
            <p className="text-xs text-gray-400 mt-1">
              Live quotes synced directly from backend database. Click any card to open quote detail workspace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchQuotes}
              className="px-3 py-1.5 rounded text-xs font-medium border border-[#333] text-gray-300 hover:bg-[#1a1a1a] transition"
            >
              ↻ Refresh
            </button>
            {user?.role === 'sales_rep' && (
              <Link
                href="/quotations/new"
                className="px-3 py-1.5 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition"
              >
                + New Quotation
              </Link>
            )}
          </div>
        </div>

        {/* Dynamic Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {COLUMNS_DEF.map((col) => {
            const colItems = quotes.filter((q) =>
              col.statuses.includes(q.status?.toLowerCase())
            );
            const totalSum = colItems.reduce(
              (acc, q) => acc + parseFloat(q.totalAmount || '0'),
              0
            );

            return (
              <div
                key={col.key}
                className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3 flex flex-col space-y-3 min-h-[420px]"
              >
                <div className="border-b border-[#222] pb-2">
                  <div className="text-xs font-semibold text-white">{col.title}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {colItems.length} quotations • ${totalSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  {colItems.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-center text-[11px] text-gray-600 border border-dashed border-[#1a1a1a] rounded">
                      No quotes
                    </div>
                  ) : (
                    colItems.map((item) => (
                      <Link
                        key={item.id}
                        href={`/quotations/${item.id}`}
                        className="block p-3 rounded border border-[#262626] bg-[#141414] hover:border-gray-400 transition cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-semibold text-white">
                            {item.quoteNumber}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 uppercase">
                            {item.customerTier || 'STD'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-300 truncate">
                          {item.customerName || item.customerCompany || 'Enterprise Account'}
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-mono font-medium text-white">
                            ${parseFloat(item.totalAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {item.repName ? item.repName.split(' ')[0] : 'Rep'}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
