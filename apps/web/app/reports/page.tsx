'use client';

import React from 'react';
import { AppHeader } from '@/components/app-header';

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Admin / Reporting Dashboard</h1>
            <p className="text-xs text-gray-400 mt-1">High-level trends, approval bottlenecks, and product performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition">
              Export PDF
            </button>
            <button className="px-3 py-1.5 rounded text-xs font-medium border border-[#333] text-gray-300 hover:bg-[#1a1a1a] transition">
              Export XLS
            </button>
          </div>
        </div>

        {/* 3 Metric Cards from PNG Screen 15 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-[#222] bg-[#0f0f0f]">
            <div className="text-xs text-gray-400">Quotes Created (Trend)</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">148</div>
            <div className="text-[11px] text-gray-500 mt-1">+12% vs last month</div>
          </div>
          <div className="p-4 rounded-lg border border-[#222] bg-[#0f0f0f]">
            <div className="text-xs text-gray-400">Avg Approval Time</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">4.2 hrs</div>
            <div className="text-[11px] text-gray-500 mt-1">-1.1 hrs faster</div>
          </div>
          <div className="p-4 rounded-lg border border-[#222] bg-[#0f0f0f]">
            <div className="text-xs text-gray-400">Top Upsold Product</div>
            <div className="text-lg font-bold text-white mt-1">Care Plan 2yr</div>
            <div className="text-[11px] text-gray-500 mt-1">38 attached</div>
          </div>
        </div>
      </main>
    </div>
  );
}
