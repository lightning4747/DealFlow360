'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { useAuth } from '@/lib/auth-context';
import { getAuthHeaders, API_BASE_URL } from '@/lib/api-client';

interface ApprovalRow {
  id: string;
  quoteId: string;
  customer: string;
  blendedRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  stage: string;
  assignedTo: string;
  status: 'pending' | 'returned' | 'approved' | 'rejected';
  lines?: any[];
  totalAmount?: string;
  requestedDiscount?: string;
}

const INITIAL_ROWS: ApprovalRow[] = [
  {
    id: 'app-001',
    quoteId: 'Q-1042',
    customer: 'Acme Corp',
    blendedRisk: 'HIGH',
    stage: 'Sales Manager',
    assignedTo: 'Carol Manager',
    status: 'pending',
    totalAmount: '$12,400',
    requestedDiscount: '18% on Server',
  },
  {
    id: 'app-002',
    quoteId: 'Q-1039',
    customer: 'Beta Industries',
    blendedRisk: 'MEDIUM',
    stage: 'Finance',
    assignedTo: 'Dave Finance',
    status: 'pending',
    totalAmount: '$29,700',
    requestedDiscount: '12% on Storage',
  },
  {
    id: 'app-003',
    quoteId: 'Q-1035',
    customer: 'Nova Retail',
    blendedRisk: 'LOW',
    stage: 'Auto Approved',
    assignedTo: 'Auto Approved',
    status: 'approved',
    totalAmount: '$5,750',
    requestedDiscount: '4% Standard',
  },
];

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'pending' | 'returned' | 'approved' | 'rejected'>('pending');
  const [approvals, setApprovals] = useState<ApprovalRow[]>(INITIAL_ROWS);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRow | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Fetch live approvals if user is logged in
  useEffect(() => {
    async function fetchApprovals() {
      try {
        const res = await fetch(`${API_BASE_URL}/sales/approvals`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setApprovals(
              json.data.map((item: any) => ({
                id: item.id,
                quoteId: item.quoteId || item.id,
                customer: item.customerName || 'Enterprise Customer',
                blendedRisk: item.blendedRiskScore > 15 ? 'HIGH' : item.blendedRiskScore > 8 ? 'MEDIUM' : 'LOW',
                stage: item.currentStage || 'Sales Manager',
                assignedTo: item.assignedRole || 'Carol Manager',
                status: item.status || 'pending',
                totalAmount: `$${item.totalAmount || '0'}`,
                requestedDiscount: `${item.maxDiscountPct || 0}%`,
              }))
            );
          }
        }
      } catch (e) {
        // Fallback to initial rows
      }
    }
    fetchApprovals();
  }, [user]);

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!selectedApproval) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const endpoint = `${API_BASE_URL}/sales/approvals/${selectedApproval.id}/${decision === 'approved' ? 'approve' : 'reject'}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          comment: actionReason || (decision === 'approved' ? 'Approved as negotiated.' : 'Exceeds allowable margin threshold.'),
          reason: actionReason || 'Exceeds allowable margin threshold.',
        }),
      });

      // Optimistic update
      setApprovals((prev) =>
        prev.map((a) => (a.id === selectedApproval.id ? { ...a, status: decision } : a))
      );
      setActionMessage(`Quotation ${selectedApproval.quoteId} has been successfully ${decision}.`);
      setTimeout(() => {
        setSelectedApproval(null);
        setActionReason('');
        setActionMessage(null);
      }, 1500);
    } catch (e) {
      // Still update UI in demo mode
      setApprovals((prev) =>
        prev.map((a) => (a.id === selectedApproval.id ? { ...a, status: decision } : a))
      );
      setActionMessage(`Quotation ${selectedApproval.quoteId} ${decision} (offline mode).`);
      setTimeout(() => {
        setSelectedApproval(null);
        setActionReason('');
        setActionMessage(null);
      }, 1500);
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = approvals.filter((r) => r.status === filter);

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Approvals &amp; Governance Queue</h1>
            <p className="text-xs text-gray-400 mt-1">
              Every quotation that exceeded limits, or is undergoing multi-step discount approval
            </p>
          </div>
          {user && (
            <div className="text-right">
              <span className="text-xs text-gray-400">Current Approver: </span>
              <span className="text-xs font-semibold text-white font-mono">{user.name} ({user.role})</span>
            </div>
          )}
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
            {approvals.filter((a) => a.status === 'pending').length} Pending
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
              filter === 'approved'
                ? 'bg-white text-black border-white font-semibold'
                : 'bg-transparent text-gray-400 border-[#333] hover:text-white'
            }`}
          >
            {approvals.filter((a) => a.status === 'approved').length} Approved
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
              filter === 'rejected'
                ? 'bg-white text-black border-white font-semibold'
                : 'bg-transparent text-gray-400 border-[#333] hover:text-white'
            }`}
          >
            {approvals.filter((a) => a.status === 'rejected').length} Rejected
          </button>
        </div>

        {/* Minimal Ruled Table */}
        <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#222] bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-medium">Quotation</th>
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Amount</th>
                <th className="py-3 px-4 font-medium">Blended Risk</th>
                <th className="py-3 px-4 font-medium">Stage</th>
                <th className="py-3 px-4 font-medium">Assigned To</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No quotations in {filter} queue.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedApproval(row)}
                    className="hover:bg-[#181818] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-white">
                      <Link href={`/quotations/${row.quoteId}`} className="hover:underline">
                        {row.quoteId}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{row.customer}</td>
                    <td className="py-3 px-4 font-mono text-gray-300">{row.totalAmount}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        row.blendedRisk === 'HIGH'
                          ? 'border-red-900 bg-red-950/40 text-red-300'
                          : row.blendedRisk === 'MEDIUM'
                          ? 'border-amber-900 bg-amber-950/40 text-amber-300'
                          : 'border-[#333] bg-[#1a1a1a] text-gray-300'
                      }`}>
                        {row.blendedRisk}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{row.stage}</td>
                    <td className="py-3 px-4 text-gray-300">{row.assignedTo}</td>
                    <td className="py-3 px-4 text-right">
                      {row.status === 'pending' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApproval(row);
                          }}
                          className="px-2.5 py-1 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition"
                        >
                          Review
                        </button>
                      ) : (
                        <span className="text-gray-500 capitalize">{row.status}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal / Slide-over for Decision */}
        {selectedApproval && (
          <div className="p-5 rounded-lg border border-[#333] bg-[#111] space-y-4">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Governance Review: {selectedApproval.quoteId} — {selectedApproval.customer}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Blended Risk: <span className="font-mono text-white">{selectedApproval.blendedRisk}</span> • Stage: {selectedApproval.stage}
                </p>
              </div>
              <button
                onClick={() => setSelectedApproval(null)}
                className="text-xs text-gray-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            {actionMessage && (
              <div className="p-3 rounded bg-[#0c1a0c] border border-green-800 text-xs text-green-300">
                {actionMessage}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300">Approval / Rejection Comments</label>
              <textarea
                rows={2}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Enter justification or counter-condition for audit trail..."
                className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href={`/quotations/${selectedApproval.quoteId}`}
                className="text-xs text-gray-400 hover:text-white underline"
              >
                View full quotation lines &amp; redline thread →
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleDecision('rejected')}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-red-800 text-red-300 hover:bg-red-950/30 transition disabled:opacity-50"
                >
                  Reject Terms
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleDecision('approved')}
                  className="px-4 py-1.5 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Approve Quotation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
