import Link from 'next/link';
import { AppHeader } from '@/components/app-header';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Sales Dashboard / Home</h1>
          <p className="text-xs text-gray-400 mt-1">Central hub, links out to every module below</p>
        </div>

        {/* 3 Metric / Status Cards from PNG Screen 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/approvals" className="p-5 rounded-lg border border-[#222] bg-[#111] hover:border-gray-600 transition block">
            <h3 className="text-sm font-semibold text-white">Pending Approvals</h3>
            <p className="text-xs text-gray-400 mt-1">4 quotations waiting</p>
          </Link>

          <Link href="/quotations" className="p-5 rounded-lg border border-[#222] bg-[#111] hover:border-gray-600 transition block">
            <h3 className="text-sm font-semibold text-white">Open Quotations</h3>
            <p className="text-xs text-gray-400 mt-1">12 active deals</p>
          </Link>

          <Link href="/deal-health" className="p-5 rounded-lg border border-[#222] bg-[#111] hover:border-gray-600 transition block">
            <h3 className="text-sm font-semibold text-white">At-Risk Deals</h3>
            <p className="text-xs text-gray-400 mt-1">3 flagged by Deal Health</p>
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link href="/quotations/new" className="px-4 py-2 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition">
            + New Quotation
          </Link>
          <Link href="/approvals" className="px-4 py-2 rounded text-xs font-medium border border-[#333] text-gray-300 hover:bg-[#1a1a1a] transition">
            View Approvals
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3 pt-4 border-t border-[#222]">
          <h2 className="text-sm font-semibold text-gray-300">Recent Activity</h2>
          <div className="space-y-2 text-xs text-gray-400">
            <p>• Acme Corp quotation approved by Finance</p>
            <p>• Beta Industries requested a discount change</p>
            <p>• East Depot stock updated for Order A1291</p>
          </div>
        </div>
      </main>
    </div>
  );
}
