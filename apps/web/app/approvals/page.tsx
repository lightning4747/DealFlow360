'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';

interface ApprovalRow {
  id: string;
  quoteId: string;
  customer: string;
  blendedRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  stage: string;
  assignedTo: string;
  status: 'pending' | 'returned' | 'approved';
}

const ROWS: ApprovalRow[] = [
  {
    id: '1',
    quoteId: 'Q-1042',
    customer: 'Acme Corp',
    blendedRisk: 'HIGH',
    stage: 'Sales Manager',
    assignedTo: 'M. Shah',
    status: 'pending',
  },
  {
    id: '2',
    quoteId: 'Q-1039',
    customer: 'Beta Industries',
    blendedRisk: 'MEDIUM',
    stage: 'Finance',
    assignedTo: 'R. Iyer',
    status: 'pending',
  },
  {
    id: '3',
    quoteId: 'Q-1035',
    customer: 'Nova Retail',
    blendedRisk: 'LOW',
    stage: 'Auto Approved',
    assignedTo: 'Auto Approved',
    status: 'approved',
  },
];

export default function ApprovalsPage() {
  const [filter, setFilter] = useState<'pending' | 'returned' | 'approved'>('pending');

  const filtered = ROWS.filter((r) => r.status === filter);

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Approvals (List)</h1>
          <p className="text-xs text-gray-400 mt-1">
            Every quotation that exceeded limits, or is going through discount approval
          </p>
        </div>

        {/* Triage Pills from PNG Screen 5 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
              filter === 'pending'
                ? 'bg-white text-black border-white font-semibold'
                : 'bg-transparent text-gray-400 border-[#333] hover:text-white'
            }`}
          >
            3 Pending
          </button>
          <button
            onClick={() => setFilter('returned')}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
              filter === 'returned'
                ? 'bg-white text-black border-white font-semibold'
                : 'bg-transparent text-gray-400 border-[#333] hover:text-white'
            }`}
          >
            1 Returned
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
              filter === 'approved'
                ? 'bg-white text-black border-white font-semibold'
                : 'bg-transparent text-gray-400 border-[#333] hover:text-white'
            }`}
          >
            2 Approved
          </button>
        </div>

        {/* Minimal Ruled Table */}
        <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#222] bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-medium">Quotation</th>
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Blended Risk</th>
                <th className="py-3 px-4 font-medium">Stage</th>
                <th className="py-3 px-4 font-medium">Assigned To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-[#181818] transition-colors cursor-pointer">
                  <td className="py-3 px-4 font-mono font-semibold text-white">{row.quoteId}</td>
                  <td className="py-3 px-4 text-gray-300">{row.customer}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-[#333] bg-[#1a1a1a] text-gray-300">
                      {row.blendedRisk}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-300">{row.stage}</td>
                  <td className="py-3 px-4 text-gray-300">{row.assignedTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500">
          Click any row to open full approval detail, risk breakdown, and audit trail.
        </p>
      </main>
    </div>
  );
}
