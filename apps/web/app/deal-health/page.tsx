'use client';

import React, { useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { API_BASE_URL, getAuthHeaders } from '@/lib/api-client';

interface StalledDeal {
  quoteId: string;
  quoteNumber: string;
  accountId: string;
  accountName?: string;
  repId: string;
  status: string;
  totalAmount: number;
  lastActivityAt: string;
  inactiveDays: number;
  suggestedAction: string;
}

interface DiscountAnomaly {
  repId: string;
  currentDiscountPercentage: number;
  historicalMean: number;
  historicalStdDev: number;
  zScore: number;
  severity: 'NONE' | 'WARNING' | 'CRITICAL';
  message: string;
}

interface DealHealthSummary {
  overallScore: number;
  activeQuotesCount: number;
  stalledDealsCount: number;
  anomaliesDetectedCount: number;
  stalledDeals: StalledDeal[];
  discountAnomalies: DiscountAnomaly[];
}

export default function DealHealthPage() {
  const [data, setData] = useState<DealHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [nudgedQuotes, setNudgedQuotes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch(`${API_BASE_URL}/analytics/deal-health`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load deal health data', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHealth();
  }, []);

  const handleNudge = (quoteId: string) => {
    setNudgedQuotes((prev) => ({ ...prev, [quoteId]: true }));
  };

  const stalledList = data?.stalledDeals || [];
  const anomalyList = data?.discountAnomalies || [];

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Deal Health & Anomaly Observability</h1>
            <p className="text-xs text-gray-400 mt-1">Real-time alerts on stalled quotes and statistical discount patterns</p>
          </div>
          {data && (
            <div className="flex items-center gap-2 bg-[#121212] border border-[#262626] px-3 py-1.5 rounded-lg">
              <span className="text-xs text-gray-400 font-mono">Health Score:</span>
              <span className={`text-sm font-bold font-mono ${data.overallScore > 80 ? 'text-emerald-400' : data.overallScore > 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                {data.overallScore}/100
              </span>
            </div>
          )}
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-[#222] bg-[#0f0f0f]">
            <div className="text-xs text-gray-400">Stalled Deals</div>
            <div className="text-lg font-bold text-white mt-1">
              {loading ? '...' : `${data?.stalledDealsCount || 0} quotes idle 7+ days`}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[#222] bg-[#0f0f0f]">
            <div className="text-xs text-gray-400">Discount Anomalies</div>
            <div className="text-lg font-bold text-white mt-1">
              {loading ? '...' : `${data?.anomaliesDetectedCount || 0} above rep average (z > 2.0)`}
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[#222] bg-[#0f0f0f]">
            <div className="text-xs text-gray-400">Active Pipeline</div>
            <div className="text-lg font-bold text-white mt-1">
              {loading ? '...' : `${data?.activeQuotesCount || 0} open opportunities`}
            </div>
          </div>
        </div>

        {/* Action Table: Stalled Deals */}
        <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
          <div className="px-4 py-3 border-b border-[#222] bg-[#141414] flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">Stalled Deals Requiring Action</span>
            <span className="text-[11px] text-gray-500 font-mono">Threshold: 7+ days</span>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#222] bg-[#111] text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-medium">Deal / Quote</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Inactive</th>
                <th className="py-3 px-4 font-medium">Amount</th>
                <th className="py-3 px-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {stalledList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500">
                    {loading ? 'Loading stalled deals...' : 'No stalled deals detected. Pipeline flow is optimal.'}
                  </td>
                </tr>
              ) : (
                stalledList.map((deal) => (
                  <tr key={deal.quoteId} className="hover:bg-[#181818] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-white">{deal.accountName || deal.quoteNumber}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{deal.quoteNumber}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#222] text-amber-300 border border-[#333]">
                        {deal.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{deal.inactiveDays} days idle</td>
                    <td className="py-3 px-4 font-mono text-gray-300">
                      ${deal.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleNudge(deal.quoteId)}
                        disabled={nudgedQuotes[deal.quoteId]}
                        className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                          nudgedQuotes[deal.quoteId]
                            ? 'border-emerald-800/60 bg-emerald-950/30 text-emerald-400'
                            : 'border-[#333] hover:bg-[#1a1a1a] text-gray-300'
                        }`}
                      >
                        {nudgedQuotes[deal.quoteId] ? 'Nudge Sent' : deal.suggestedAction || 'Nudge rep'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Action Table: Discount Anomalies */}
        {anomalyList.length > 0 && (
          <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
            <div className="px-4 py-3 border-b border-[#222] bg-[#141414] flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Statistical Discount Anomalies</span>
              <span className="text-[11px] text-gray-500 font-mono">z-score &gt; 2.0</span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#222] bg-[#111] text-gray-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-medium">Rep ID</th>
                  <th className="py-3 px-4 font-medium">Discount</th>
                  <th className="py-3 px-4 font-medium">Rep 30d Baseline</th>
                  <th className="py-3 px-4 font-medium">z-Score</th>
                  <th className="py-3 px-4 font-medium">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e1e]">
                {anomalyList.map((anom, idx) => (
                  <tr key={idx} className="hover:bg-[#181818] transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-300">{anom.repId.slice(0, 8)}...</td>
                    <td className="py-3 px-4 font-mono font-bold text-white">{anom.currentDiscountPercentage}%</td>
                    <td className="py-3 px-4 text-gray-400">
                      Mean: {anom.historicalMean}% (σ={anom.historicalStdDev}%)
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-400">+{anom.zScore}σ</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          anom.severity === 'CRITICAL'
                            ? 'bg-rose-950/40 text-rose-300 border-rose-800/60'
                            : 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                        }`}
                      >
                        {anom.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
