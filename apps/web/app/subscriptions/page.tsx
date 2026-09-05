'use client';

import React from 'react';
import { AppHeader } from '@/components/app-header';

export default function SubscriptionsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Subscriptions (List)</h1>
          <p className="text-xs text-gray-400 mt-1">Every recurring plan across every customer, regardless of which order it came from</p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded text-xs border border-[#333] bg-white text-black font-semibold">14 Active</span>
          <span className="px-2.5 py-1 rounded text-xs border border-[#333] bg-[#111] text-gray-400">2 Paused</span>
          <span className="px-2.5 py-1 rounded text-xs border border-[#333] bg-[#111] text-gray-400">1 Cancelled</span>
        </div>

        <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#222] bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Plan</th>
                <th className="py-3 px-4 font-medium">Cycle</th>
                <th className="py-3 px-4 font-medium">Next Bill</th>
                <th className="py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              <tr className="hover:bg-[#181818] transition-colors cursor-pointer">
                <td className="py-3 px-4 text-white font-medium">Acme Corp</td>
                <td className="py-3 px-4 text-gray-300">Care Plan 2yr</td>
                <td className="py-3 px-4 text-gray-400">Monthly</td>
                <td className="py-3 px-4 text-gray-400">Sep 15</td>
                <td className="py-3 px-4 text-gray-300">Active</td>
              </tr>
              <tr className="hover:bg-[#181818] transition-colors cursor-pointer">
                <td className="py-3 px-4 text-white font-medium">Beta Industries</td>
                <td className="py-3 px-4 text-gray-300">Support SLA</td>
                <td className="py-3 px-4 text-gray-400">Quarterly</td>
                <td className="py-3 px-4 text-gray-400">Nov 1</td>
                <td className="py-3 px-4 text-gray-300">Active</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
