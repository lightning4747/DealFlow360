'use client';

import React from 'react';
import { AppHeader } from '@/components/app-header';

export default function DealHealthPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Deal Health and Anomaly Dashboard</h1>
          <p className="text-xs text-gray-400 mt-1">Real-time alerts on stalled quotes and unusual discount patterns</p>
        </div>

        {/* 3 Metric Cards from PNG Screen 14 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-[#222] bg-[#0f0f0f]">
            <div className="text-xs text-gray-400">Stalled Deals</div>
            <div className="text-lg font-bold text-white mt-1">4 quotes idle 7+ days</div>
          </div>
          <div className="p-4 rounded-lg border border-[#222] bg-[#0f0f0f]">
            <div className="text-xs text-gray-400">Discount Anomalies</div>
            <div className="text-lg font-bold text-white mt-1">2 above rep average</div>
          </div>
          <div className="p-4 rounded-lg border border-[#222] bg-[#0f0f0f]">
            <div className="text-xs text-gray-400">Delivery Slippage</div>
            <div className="text-lg font-bold text-white mt-1">1 promise date at risk</div>
          </div>
        </div>

        {/* Action Table */}
        <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#222] bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-medium">Deal</th>
                <th className="py-3 px-4 font-medium">Issue</th>
                <th className="py-3 px-4 font-medium">Flagged</th>
                <th className="py-3 px-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              <tr className="hover:bg-[#181818] transition-colors">
                <td className="py-3 px-4 font-mono font-semibold text-white">Zenith Co</td>
                <td className="py-3 px-4 text-gray-300">Idle 9 days</td>
                <td className="py-3 px-4 text-gray-400">Aug 24</td>
                <td className="py-3 px-4">
                  <button className="px-2.5 py-1 rounded text-xs border border-[#333] hover:bg-[#1a1a1a] text-gray-300">
                    Nudge rep
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-[#181818] transition-colors">
                <td className="py-3 px-4 font-mono font-semibold text-white">Delta LLC</td>
                <td className="py-3 px-4 text-gray-300">Discount 22% vs avg 8%</td>
                <td className="py-3 px-4 text-gray-400">Aug 25</td>
                <td className="py-3 px-4">
                  <button className="px-2.5 py-1 rounded text-xs border border-[#333] hover:bg-[#1a1a1a] text-gray-300">
                    Escalated to Manager
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
