'use client';

import React, { useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { API_BASE_URL, getAuthHeaders } from '@/lib/api-client';

interface VelocityMetric {
  timeBucket: string;
  quoteCreations: number;
  quoteApprovals: number;
  quoteConversions: number;
  averageCycleHours: number;
}

export default function ReportsPage() {
  const [velocity, setVelocity] = useState<VelocityMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await fetch(`${API_BASE_URL}/analytics/velocity`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          setVelocity(json);
        }
      } catch (err) {
        console.error('Failed to load velocity metrics', err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  const totalCreations = velocity.reduce((acc, v) => acc + v.quoteCreations, 0);
  const totalApprovals = velocity.reduce((acc, v) => acc + v.quoteApprovals, 0);
  const totalConversions = velocity.reduce((acc, v) => acc + v.quoteConversions, 0);

  const exportCsv = () => {
    const header = ['timeBucket', 'quoteCreations', 'quoteApprovals', 'quoteConversions', 'averageCycleHours'];
    const rows = velocity.map((metric) => [
      metric.timeBucket,
      metric.quoteCreations,
      metric.quoteApprovals,
      metric.quoteConversions,
      metric.averageCycleHours,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([`${csv}\r\n`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `dealflow-velocity-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Executive & Operations Reporting</h1>
            <p className="text-xs text-gray-400 mt-1">Real-time pipeline velocity, approval cycle times, and conversion aggregates</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition"
            >
              Export PDF
            </button>
            <button 
              onClick={exportCsv}
              className="px-3 py-1.5 rounded text-xs font-medium border border-[#333] text-gray-300 hover:bg-[#1a1a1a] transition"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-[#222] bg-[#0f0f0f]">
            <div className="text-xs text-gray-400">Quotes Created (24h)</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {loading ? '...' : totalCreations}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">Live aggregated velocity</div>
          </div>
          <div className="p-4 rounded-lg border border-[#222] bg-[#0f0f0f]">
            <div className="text-xs text-gray-400">Quotes Approved (24h)</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {loading ? '...' : totalApprovals}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Avg cycle: 4.2 hrs</div>
          </div>
          <div className="p-4 rounded-lg border border-[#222] bg-[#0f0f0f]">
            <div className="text-xs text-gray-400">Quotes Converted (24h)</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {loading ? '...' : totalConversions}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">Direct to Order &amp; Billing</div>
          </div>
        </div>

        {/* Velocity Table */}
        <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
          <div className="px-4 py-3 border-b border-[#222] bg-[#141414] flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">Recent Hourly Velocity Buckets</span>
            <span className="text-[11px] text-gray-500 font-mono">TimescaleDB / Continuous Aggregates</span>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#222] bg-[#111] text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-medium">Time Bucket (UTC)</th>
                <th className="py-3 px-4 font-medium">Quotes Created</th>
                <th className="py-3 px-4 font-medium">Quotes Approved</th>
                <th className="py-3 px-4 font-medium">Quotes Converted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {velocity.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-500">
                    {loading ? 'Loading velocity aggregates...' : 'No velocity data recorded in current 24-hour window.'}
                  </td>
                </tr>
              ) : (
                velocity.map((v, i) => (
                  <tr key={i} className="hover:bg-[#181818] transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-300">{new Date(v.timeBucket).toUTCString()}</td>
                    <td className="py-3 px-4 font-mono text-white">{v.quoteCreations}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400">{v.quoteApprovals}</td>
                    <td className="py-3 px-4 font-mono text-cyan-400">{v.quoteConversions}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
