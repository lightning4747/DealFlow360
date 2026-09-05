'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Package,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { AccountSwitcher } from '../../../components/account-switcher';

interface CustomerQuote {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName?: string;
  companyName?: string;
  tier?: string;
  totalAmount: string;
  status: string;
  blendedRiskScore: string;
  createdAt: string;
  expiresAt?: string;
}

export default function CustomerOrdersPage() {
  const [quotes, setQuotes] = useState<CustomerQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingQuoteId, setSigningQuoteId] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('customer');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role) setUserRole(parsed.role);
      }
    } catch {}
  }, []);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const fetchCustomerOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/sales/approvals`);
      let list: CustomerQuote[] = [];

      if (res.ok) {
        const json = await res.json();
        const raw = Array.isArray(json) ? json : json.data || [];
        list = raw.map((item: any) => ({
          id: item.quoteId || item.id,
          quoteNumber: item.quoteNumber || 'QTE-DEMO-001',
          customerId: item.customerId || '1697218f-3311-4181-bc78-a511891280fe',
          customerName: 'Acme Corporation',
          companyName: 'Acme Global Industries',
          tier: 'Gold Enterprise',
          totalAmount: item.totalAmount || '12000.00',
          status: item.status === 'approved' ? 'sent' : item.status || 'sent',
          blendedRiskScore: item.brsScore || '0.00',
          createdAt: item.createdAt || new Date().toISOString(),
        }));
      }

      if (!list.some((q) => q.quoteNumber === 'QTE-DEMO-001-AUTO')) {
        list.unshift({
          id: '3e537586-7d2e-45c2-bb81-360af68de5a6',
          quoteNumber: 'QTE-DEMO-001-AUTO',
          customerId: '1697218f-3311-4181-bc78-a511891280fe',
          customerName: 'Acme Corporation',
          companyName: 'Acme Global Industries',
          tier: 'Gold Enterprise',
          totalAmount: '4050.00',
          status: 'sent',
          blendedRiskScore: '0.00',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        });
      }

      setQuotes(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerOrders();
  }, []);

  const handleAcceptQuote = (quoteId: string, quoteNumber: string) => {
    setSigningQuoteId(quoteId);
    setTimeout(() => {
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: 'confirmed' } : q))
      );
      setSigningQuoteId(null);
      setSuccessNotice(`Order confirmed for Quote ${quoteNumber}! Order is scheduled for fulfillment.`);
      setTimeout(() => setSuccessNotice(null), 5000);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Customer Portal Navigation Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 md:px-12 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center space-x-4">
          <div className="h-9 w-9 rounded-xl bg-cyan-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base leading-none text-white">Acme Global Industries</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                Gold Enterprise Partner
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Customer Buyer Portal & Contracted Orders</p>
          </div>
        </div>

        {/* Links & Switcher */}
        <div className="flex items-center space-x-3">
          {userRole === 'admin' && (
            <>
              <Link
                href="/admin/products"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition"
              >
                <Package className="h-3.5 w-3.5 text-blue-400" />
                <span>Admin Catalog</span>
              </Link>
              <Link
                href="/approvals"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                <span>Governance Queue</span>
              </Link>
            </>
          )}
          <AccountSwitcher />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10 space-y-8">
        {/* Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Account Active & In Good Standing</p>
            </div>
            <h2 className="text-2xl font-bold text-white mt-1">Contracted Quotations & Orders</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Review and electronically sign finalized quotations provided by your dedicated sales team with locked-in Gold tier pricing discounts.
            </p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-right min-w-[200px]">
            <span className="text-xs text-slate-500 uppercase tracking-wider block">Contracted Tier Discount</span>
            <span className="text-2xl font-black text-amber-400">Up to 25.0% OFF</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Gold Enterprise Schedule</span>
          </div>
        </div>

        {/* Success Alert */}
        {successNotice && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-3 text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Orders List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-cyan-400" />
              <span>Quotes Awaiting Customer Acceptance</span>
            </h3>
            <button
              onClick={fetchCustomerOrders}
              className="text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 transition"
            >
              Refresh Orders
            </button>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
              Loading orders for Acme Global Industries...
            </div>
          ) : quotes.length === 0 ? (
            <div className="p-16 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
              No quotes currently open for this customer account.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {quotes.map((q) => {
                const isSent = q.status === 'sent' || q.status === 'approved';
                const isConfirmed = q.status === 'confirmed';
                const isPending = q.status === 'pending_approval' || q.status === 'pending';

                return (
                  <div
                    key={q.id}
                    className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold font-mono text-white">{q.quoteNumber}</span>
                        {isSent && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Ready for Signature
                          </span>
                        )}
                        {isConfirmed && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Confirmed & Accepted</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Internal Governance Review</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span>
                          Account: <strong className="text-slate-200">Acme Global Industries</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Created: <strong className="text-slate-200">{new Date(q.createdAt).toLocaleDateString()}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Pricing Tier: <strong className="text-amber-400">Gold Enterprise</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Net Total</span>
                        <span className="text-2xl font-black text-white font-mono">
                          ${parseFloat(q.totalAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div>
                        {isSent && (
                          <button
                            disabled={signingQuoteId === q.id}
                            onClick={() => handleAcceptQuote(q.id, q.quoteNumber)}
                            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold shadow-lg shadow-cyan-600/20 transition flex items-center space-x-2 disabled:opacity-50"
                          >
                            <span>{signingQuoteId === q.id ? 'Signing...' : 'Accept & Order'}</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        )}
                        {isConfirmed && (
                          <button
                            disabled
                            className="px-4 py-2 rounded-xl bg-slate-800 text-emerald-400 text-xs font-medium border border-emerald-500/30 flex items-center space-x-1.5"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Order Active</span>
                          </button>
                        )}
                        {isPending && (
                          <div className="px-4 py-2 rounded-xl bg-slate-900 text-amber-400 text-xs font-medium border border-amber-500/20 flex items-center space-x-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>In Governance Review</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
