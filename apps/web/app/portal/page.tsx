'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

interface CustomerQuote {
  id: string;
  quoteNumber: string;
  status: string;
  totalAmount: string;
  counterDiscountPct?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CustomerPortalDashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [quotes, setQuotes] = useState<CustomerQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuotes([]);
    setError('Open a quote-specific magic link to view and manage a quotation.');
    setLoading(false);
  }, []);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'confirmed' || s === 'approved') {
      return (
        <span className="px-2.5 py-0.5 rounded text-[11px] font-mono border border-emerald-800 bg-emerald-950/40 text-emerald-400">
          CONFIRMED
        </span>
      );
    }
    if (s === 'under_negotiation' || s === 'negotiation') {
      return (
        <span className="px-2.5 py-0.5 rounded text-[11px] font-mono border border-amber-800 bg-amber-950/40 text-amber-400">
          UNDER NEGOTIATION
        </span>
      );
    }
    if (s === 'pending_approval') {
      return (
        <span className="px-2.5 py-0.5 rounded text-[11px] font-mono border border-purple-800 bg-purple-950/40 text-purple-400">
          GOVERNANCE REVIEW
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded text-[11px] font-mono border border-[#333] bg-[#1a1a1a] text-gray-300">
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Customer Portal Top Nav */}
      <header className="h-14 border-b border-[#222] bg-[#0c0c0c] px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-6">
          <Link href="/portal" className="text-sm font-semibold tracking-tight text-white mr-2">
            DealFlow360 <span className="text-xs text-gray-400 font-normal">| Customer Portal</span>
          </Link>
          <nav className="flex items-center space-x-1">
            <span className="px-3 py-1 rounded text-xs font-semibold bg-white text-black">
              My Orders &amp; Quotes
            </span>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-xs font-medium text-white">{user?.name || 'Customer Account'}</div>
            <div className="text-[10px] text-gray-400 font-mono">{user?.email || 'procurement@acme.com'}</div>
          </div>
          {user ? (
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-white border border-[#333] px-2.5 py-1 rounded bg-[#111] hover:bg-[#1f1f1f] transition"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className="text-xs text-gray-400 hover:text-white border border-[#333] px-2.5 py-1 rounded bg-[#111] hover:bg-[#1f1f1f] transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto p-8 space-y-6 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#222] pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Customer Purchasing Dashboard</h1>
            <p className="text-xs text-gray-400 mt-1">
              View all active quotations, track past purchase orders, propose line counter-discounts, and confirm terms.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.refresh()}
              className="px-3 py-1.5 rounded text-xs border border-[#333] text-gray-300 hover:bg-[#1a1a1a] transition"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Customer Account Details Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-[#222] bg-[#0c0c0c]">
            <div className="text-[11px] text-gray-400 uppercase tracking-wider">Account Organization</div>
            <div className="text-sm font-semibold text-white mt-1">
              {user?.name || 'Acme Corporation'}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-0.5">Gold Partner Tier (Up to 25% Benefit)</div>
          </div>
          <div className="p-4 rounded-lg border border-[#222] bg-[#0c0c0c]">
            <div className="text-[11px] text-gray-400 uppercase tracking-wider">Active Deals / Quotes</div>
            <div className="text-sm font-semibold text-white mt-1">
              {quotes.filter((q) => q.status !== 'confirmed').length} In Negotiation
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">Real-time collaboration active</div>
          </div>
          <div className="p-4 rounded-lg border border-[#222] bg-[#0c0c0c]">
            <div className="text-[11px] text-gray-400 uppercase tracking-wider">Confirmed Orders</div>
            <div className="text-sm font-semibold text-white mt-1">
              {quotes.filter((q) => q.status === 'confirmed').length} Orders Executed
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">Bifurcated to Billing &amp; Warehouse</div>
          </div>
        </div>

        {/* Quotations Ledger */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
              Quotations &amp; Purchases For Your Account
            </h2>
            <span className="text-[11px] text-gray-500 font-mono">
              {quotes.length} total records
            </span>
          </div>

          <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading account quotations...</div>
            ) : error ? (
              <div className="p-8 text-center text-xs text-rose-400">{error}</div>
            ) : quotes.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                No quotations currently assigned to your account.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#222] bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 font-medium">Quote Number</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Counter Discount</th>
                    <th className="py-3 px-4 font-medium">Total Amount</th>
                    <th className="py-3 px-4 font-medium">Created Date</th>
                    <th className="py-3 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e1e]">
                  {quotes.map((q) => (
                    <tr
                      key={q.id}
                      onClick={() => router.push(`/portal/quotes/${q.id}`)}
                      className="hover:bg-[#181818] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {q.quoteNumber}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(q.status)}</td>
                      <td className="py-3 px-4 font-mono text-gray-300">
                        {q.counterDiscountPct ? `${parseFloat(q.counterDiscountPct)}%` : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-white font-medium">
                        ${parseFloat(q.totalAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {new Date(q.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/portal/quotes/${q.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 rounded bg-white text-black font-semibold text-[11px] hover:bg-gray-200 transition"
                        >
                          Negotiate &amp; Review →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
