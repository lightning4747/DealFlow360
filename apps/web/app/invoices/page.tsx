'use client';

import React from 'react';
import { AppHeader } from '@/components/app-header';

export default function InvoicesPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Invoices (List)</h1>
          <p className="text-xs text-gray-400 mt-1">Every invoice generated from one-time and recurring billing</p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded text-xs border border-[#333] bg-white text-black font-semibold">4 Unpaid</span>
          <span className="px-2.5 py-1 rounded text-xs border border-[#333] bg-[#111] text-gray-400">21 Paid</span>
        </div>

        <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#222] bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-medium">Invoice #</th>
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Amount</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              <tr className="hover:bg-[#181818] transition-colors cursor-pointer">
                <td className="py-3 px-4 font-mono font-semibold text-white">INV-1042</td>
                <td className="py-3 px-4 text-gray-300">Acme Corp</td>
                <td className="py-3 px-4 font-mono text-white">$2,750</td>
                <td className="py-3 px-4 text-gray-300">Unpaid</td>
                <td className="py-3 px-4 text-gray-400">Sep 15</td>
              </tr>
              <tr className="hover:bg-[#181818] transition-colors cursor-pointer">
                <td className="py-3 px-4 font-mono font-semibold text-white">INV-1041</td>
                <td className="py-3 px-4 text-gray-300">Acme Corp</td>
                <td className="py-3 px-4 font-mono text-white">$45</td>
                <td className="py-3 px-4 text-gray-400">Paid</td>
                <td className="py-3 px-4 text-gray-400">Sep 15</td>
              </tr>
              <tr className="hover:bg-[#181818] transition-colors cursor-pointer">
                <td className="py-3 px-4 font-mono font-semibold text-white">INV-1035</td>
                <td className="py-3 px-4 text-gray-300">Nova Retail</td>
                <td className="py-3 px-4 font-mono text-white">$5,750</td>
                <td className="py-3 px-4 text-gray-400">Paid</td>
                <td className="py-3 px-4 text-gray-400">Aug 30</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
