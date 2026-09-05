'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Sales Dashboard / Home</h1>
          <p className="text-xs text-gray-400 mt-1">Central hub, links out to every module below</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/approvals" className="p-5 rounded-lg border border-[#222] bg-[#111] hover:border-gray-600 transition block">
            <h3 className="text-sm font-semibold text-white">Pending Approvals</h3>
            <p className="text-xs text-gray-400 mt-1">Review persisted approval requests</p>
          </Link>

          <Link href="/quotations" className="p-5 rounded-lg border border-[#222] bg-[#111] hover:border-gray-600 transition block">
            <h3 className="text-sm font-semibold text-white">Open Quotations</h3>
            <p className="text-xs text-gray-400 mt-1">Browse persisted quotations</p>
          </Link>

          <Link href="/deal-health" className="p-5 rounded-lg border border-[#222] bg-[#111] hover:border-gray-600 transition block">
            <h3 className="text-sm font-semibold text-white">At-Risk Deals</h3>
            <p className="text-xs text-gray-400 mt-1">Review live deal-health alerts</p>
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
