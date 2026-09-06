'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { useAuth } from '@/lib/auth-context';
import { API_BASE_URL, getAuthHeaders } from '@/lib/api-client';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [quoteCount, setQuoteCount] = useState<number | null>(null);
  const [approvalCount, setApprovalCount] = useState<number | null>(null);
  const [healthCount, setHealthCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      setLoadError(null);
      const headers = getAuthHeaders();
      const quoteRes = await fetch(`${API_BASE_URL}/sales/quotes`, { headers, cache: 'no-store' });
      if (!quoteRes.ok) throw new Error(`Dashboard data unavailable (HTTP ${quoteRes.status})`);
      const quoteJson = await quoteRes.json();
      setQuoteCount(quoteJson.meta?.total ?? (Array.isArray(quoteJson.data) ? quoteJson.data.length : 0));
      if (user?.role === 'sales_manager' || user?.role === 'finance') {
        const approvalRes = await fetch(`${API_BASE_URL}/sales/approvals?status=pending`, {
          headers,
          cache: 'no-store',
        });
        if (!approvalRes.ok) throw new Error(`Dashboard data unavailable (HTTP ${approvalRes.status})`);
        const approvals = (await approvalRes.json()).data || [];
        setApprovalCount(approvals.filter((approval: { status?: string }) => approval.status === 'pending').length);
      } else {
        setApprovalCount(0);
      }
      const healthRes = await fetch(`${API_BASE_URL}/analytics/deal-health`, { headers });
      if (!healthRes.ok) throw new Error(`Dashboard data unavailable (HTTP ${healthRes.status})`);
      const data = await healthRes.json();
      setHealthCount(Array.isArray(data?.data?.alerts) ? data.data.alerts.length : Array.isArray(data?.alerts) ? data.alerts.length : 0);
    };
    load().catch((error: Error) => setLoadError(error.message));
  }, [authLoading, user]);
  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Sales Dashboard / Home</h1>
          <p className="text-xs text-gray-400 mt-1">Central hub, links out to every module below</p>
        </div>
        {loadError && <div className="p-4 border border-rose-900 bg-rose-950/30 rounded text-xs text-rose-300">{loadError}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/approvals" className="p-5 rounded-lg border border-[#222] bg-[#111] hover:border-gray-600 transition block">
            <h3 className="text-sm font-semibold text-white">Pending Approvals</h3>
            <p className="text-xs text-gray-400 mt-1">{approvalCount === null ? 'Loading...' : `${approvalCount} persisted requests`}</p>
          </Link>

          <Link href="/quotations" className="p-5 rounded-lg border border-[#222] bg-[#111] hover:border-gray-600 transition block">
            <h3 className="text-sm font-semibold text-white">Open Quotations</h3>
            <p className="text-xs text-gray-400 mt-1">{quoteCount === null ? 'Loading...' : `${quoteCount} persisted quotations`}</p>
          </Link>

          <Link href="/deal-health" className="p-5 rounded-lg border border-[#222] bg-[#111] hover:border-gray-600 transition block">
            <h3 className="text-sm font-semibold text-white">At-Risk Deals</h3>
            <p className="text-xs text-gray-400 mt-1">{healthCount === null ? 'Loading...' : `${healthCount} live alerts`}</p>
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {user?.role === 'sales_rep' && (
            <Link href="/quotations/new" className="px-4 py-2 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition">
              + New Quotation
            </Link>
          )}
          <Link href="/approvals" className="px-4 py-2 rounded text-xs font-medium border border-[#333] text-gray-300 hover:bg-[#1a1a1a] transition">
            View Approvals
          </Link>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#222]">
          <h2 className="text-sm font-semibold text-gray-300">Recent Activity</h2>
          <p className="text-xs text-gray-500">Open a module to load the latest persisted records.</p>
        </div>
      </main>
    </div>
  );
}
