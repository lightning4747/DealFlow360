'use client';

import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/app-header';
import { API_BASE_URL, getAuthHeaders } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

interface SubscriptionItem {
  id: string;
  customerId: string;
  customerName?: string;
  productId?: string;
  productName?: string;
  planName: string;
  planInterval: 'monthly' | 'quarterly' | 'yearly';
  quantity: number;
  unitPrice: string;
  discountPct: string;
  mrr: string;
  amount: string;
  currency: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate?: string;
  autoRenew: boolean;
}

interface BillingScheduleItem {
  id: string;
  scheduleDate: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amount: string;
  status: string;
}

interface SubscriptionDetail extends SubscriptionItem {
  schedules: BillingScheduleItem[];
}

export default function SubscriptionsPage() {
  const { isLoading: authLoading } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedSub, setSelectedSub] = useState<SubscriptionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modification Modal State
  const [modifyModalOpen, setModifyModalOpen] = useState(false);
  const [targetQuantity, setTargetQuantity] = useState<number>(1);
  const [prorationPreview, setProrationPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [modifySubmitting, setModifySubmitting] = useState(false);

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelType, setCancelType] = useState<'immediate' | 'end_of_period'>('immediate');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading) fetchSubscriptions();
  }, [filterStatus, authLoading]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const url =
        filterStatus === 'all'
          ? `${API_BASE_URL}/internal/subscriptions`
          : `${API_BASE_URL}/internal/subscriptions?status=${filterStatus}`;

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch subscriptions`);
      const json = await res.json();
      setSubscriptions(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openSubDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`${API_BASE_URL}/internal/subscriptions/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load subscription details');
      const json = await res.json();
      setSelectedSub(json.data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  // Reactive Proration Preview Calculation
  useEffect(() => {
    if (!modifyModalOpen || !selectedSub || targetQuantity <= 0 || targetQuantity === selectedSub.quantity) {
      setProrationPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const res = await fetch(
          `${API_BASE_URL}/internal/subscriptions/${selectedSub.id}/proration-preview?targetQuantity=${targetQuantity}`,
          { headers: getAuthHeaders() },
        );
        if (!res.ok) throw new Error('Failed to compute proration preview');
        const json = await res.json();
        setProrationPreview(json.data);
      } catch (err: any) {
        console.error(err);
      } finally {
        setPreviewLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [targetQuantity, modifyModalOpen, selectedSub]);

  const handleCommitModification = async () => {
    if (!selectedSub || targetQuantity <= 0) return;
    try {
      setModifySubmitting(true);
      const res = await fetch(`${API_BASE_URL}/internal/subscriptions/${selectedSub.id}/quantity`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newQuantity: targetQuantity }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to modify seats');
      }
      setModifyModalOpen(false);
      await openSubDetail(selectedSub.id);
      await fetchSubscriptions();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setModifySubmitting(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!selectedSub || !cancelReason.trim()) return;
    try {
      setCancelSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/internal/subscriptions/${selectedSub.id}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          cancellationType: cancelType,
          reason: cancelReason.trim(),
          issueCredit: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to cancel subscription');
      }
      setCancelModalOpen(false);
      setCancelReason('');
      await openSubDetail(selectedSub.id);
      await fetchSubscriptions();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCancelSubmitting(false);
    }
  };

  const totalMrr = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + parseFloat(s.mrr || '0'), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">Active</span>;
      case 'paused':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950 text-amber-400 border border-amber-800">Paused</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950 text-rose-400 border border-rose-800">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-900 text-gray-400 border border-gray-700 capitalize">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Subscriptions & Recurring Plans</h1>
            <p className="text-xs text-gray-400 mt-1">
              Recurring contract lifecycle management, forward billing schedules, and mathematical proration engine.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="text-[10px] uppercase text-gray-400 block font-mono">Active Monthly Run-Rate</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                ${totalMrr.toLocaleString('en-US', { minimumFractionDigits: 2 })}/mo
              </span>
            </div>
            <button
              onClick={() => fetchSubscriptions()}
              className="px-3 py-1.5 rounded text-xs bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-gray-300 font-medium transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center space-x-2">
          {['all', 'active', 'paused', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded text-xs border transition capitalize ${
                filterStatus === st
                  ? 'bg-white text-black font-semibold border-white'
                  : 'bg-[#111] text-gray-400 border-[#333] hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Subscriptions Table */}
        <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading subscriptions...</div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-rose-400">{error}</div>
          ) : subscriptions.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">No subscriptions found for this filter.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#222] bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-medium">Customer</th>
                  <th className="py-3 px-4 font-medium">Plan / Product</th>
                  <th className="py-3 px-4 font-medium">Cadence</th>
                  <th className="py-3 px-4 font-medium">Seats / Qty</th>
                  <th className="py-3 px-4 font-medium">MRR</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Next Billing</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e1e]">
                {subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => openSubDetail(sub.id)}
                    className="hover:bg-[#181818] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 text-white font-medium">{sub.customerName || 'Enterprise Customer'}</td>
                    <td className="py-3 px-4 text-gray-300 font-medium">{sub.planName}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono capitalize">{sub.planInterval}</td>
                    <td className="py-3 px-4 font-mono text-white">{sub.quantity}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-medium">
                      ${parseFloat(sub.mrr).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(sub.status)}</td>
                    <td className="py-3 px-4 text-gray-400">
                      {sub.nextBillingDate
                        ? new Date(sub.nextBillingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openSubDetail(sub.id);
                        }}
                        className="text-xs text-gray-300 hover:text-white underline font-mono"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Subscription Detail & 12-Month Schedule Modal */}
        {selectedSub && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#111] border border-[#333] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#222] pb-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-bold text-white">{selectedSub.planName}</h2>
                    {getStatusBadge(selectedSub.status)}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Account: {selectedSub.customerName || 'Enterprise Customer'} | Interval: {selectedSub.planInterval}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSub(null)}
                  className="text-gray-400 hover:text-white text-sm px-2 py-1 border border-[#333] rounded bg-[#181818]"
                >
                  ✕ Close
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-4 bg-[#161616] p-4 rounded-lg border border-[#262626]">
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block">Quantity (Seats)</span>
                  <span className="text-base font-bold text-white font-mono">{selectedSub.quantity}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block">Unit Price / Seat</span>
                  <span className="text-base font-bold text-white font-mono">${parseFloat(selectedSub.unitPrice).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block">Monthly Rate</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">${parseFloat(selectedSub.mrr).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block">Current Period End</span>
                  <span className="text-xs text-gray-200 block mt-1">
                    {new Date(selectedSub.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* 12-Month Forward Billing Schedule Timeline */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Forward Billing Schedule (12-Month Plan)
                  </h3>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {selectedSub.schedules?.length || 0} scheduled milestones
                  </span>
                </div>
                <div className="border border-[#262626] rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#181818] border-b border-[#262626] text-gray-400 text-[11px] sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Billing Date</th>
                        <th className="py-2.5 px-3">Period Range</th>
                        <th className="py-2.5 px-3">Scheduled Amount</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222]">
                      {selectedSub.schedules?.map((sched, idx) => (
                        <tr key={sched.id} className="hover:bg-[#161616]">
                          <td className="py-2 px-3 text-white font-mono">
                            {new Date(sched.scheduleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-2 px-3 text-gray-400 font-mono text-[11px]">
                            {new Date(sched.periodStart).toLocaleDateString()} – {new Date(sched.periodEnd).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-3 text-emerald-400 font-mono font-medium">
                            ${parseFloat(sched.amount).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                sched.status === 'paid'
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : sched.status === 'invalidated'
                                  ? 'bg-gray-900 text-gray-500 line-through'
                                  : 'bg-amber-950 text-amber-400'
                              }`}
                            >
                              {sched.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between border-t border-[#222] pt-4">
                <div className="space-x-3">
                  {selectedSub.status === 'active' && (
                    <button
                      onClick={() => {
                        setTargetQuantity(selectedSub.quantity);
                        setModifyModalOpen(true);
                      }}
                      className="px-4 py-2 rounded text-xs bg-white text-black font-semibold hover:bg-gray-200 transition"
                    >
                      Modify Seats (Proration)
                    </button>
                  )}
                </div>

                {selectedSub.status === 'active' && (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="px-3 py-2 rounded text-xs bg-rose-950 text-rose-300 border border-rose-900 hover:bg-rose-900 transition font-medium"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mid-Cycle Seat Adjustment Modal with Real-Time Proration Preview */}
        {modifyModalOpen && selectedSub && (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#333] rounded-xl max-w-lg w-full p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#222] pb-3">
                <h3 className="text-sm font-bold text-white">Adjust Subscription Seats (Mid-Cycle)</h3>
                <button
                  onClick={() => setModifyModalOpen(false)}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Target Seat Count</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min={1}
                      value={targetQuantity}
                      onChange={(e) => setTargetQuantity(parseInt(e.target.value, 10) || 1)}
                      className="w-32 bg-[#0a0a0a] border border-[#333] rounded p-2 text-sm text-white font-mono font-bold"
                    />
                    <span className="text-xs text-gray-400">
                      Current: <strong className="text-white">{selectedSub.quantity} seats</strong> (Δ{' '}
                      {targetQuantity - selectedSub.quantity >= 0
                        ? `+${targetQuantity - selectedSub.quantity}`
                        : `${targetQuantity - selectedSub.quantity}`}{' '}
                      seats)
                    </span>
                  </div>
                </div>

                {/* Instant Proration Engine Preview */}
                <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono">
                      Proration Calculation Preview
                    </span>
                    {previewLoading && <span className="text-[10px] text-amber-400">Recalculating...</span>}
                  </div>

                  {prorationPreview ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-[#1c1c1c]">
                        <span className="text-gray-400">Cycle Days Remaining:</span>
                        <span className="font-mono text-white">
                          {prorationPreview.daysRemaining} / {prorationPreview.daysInCycle} days (
                          {(prorationPreview.prorationFactor * 100).toFixed(1)}%)
                        </span>
                      </div>

                      {parseFloat(prorationPreview.estimatedCharge) > 0 && (
                        <div className="flex justify-between py-1 text-emerald-400 font-medium">
                          <span>Immediate Upcharge Invoice:</span>
                          <span className="font-mono font-bold">
                            +${parseFloat(prorationPreview.estimatedCharge).toFixed(2)}
                          </span>
                        </div>
                      )}

                      {parseFloat(prorationPreview.estimatedCredit) > 0 && (
                        <div className="flex justify-between py-1 text-amber-400 font-medium">
                          <span>Credit Note Issued:</span>
                          <span className="font-mono font-bold">
                            -${parseFloat(prorationPreview.estimatedCredit).toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between py-1 border-t border-[#1c1c1c] pt-2">
                        <span className="text-gray-300">New Monthly Run-Rate:</span>
                        <span className="font-mono font-bold text-white">
                          ${parseFloat(prorationPreview.newCycleMrr).toFixed(2)}/mo
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 italic py-2">
                      Enter a new quantity to generate mathematical proration preview.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#222]">
                <button
                  onClick={() => setModifyModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs border border-[#333] text-gray-300 hover:bg-[#222]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommitModification}
                  disabled={modifySubmitting || targetQuantity === selectedSub.quantity || targetQuantity <= 0}
                  className="px-4 py-1.5 rounded text-xs bg-white text-black font-semibold hover:bg-gray-200 disabled:opacity-50 transition"
                >
                  {modifySubmitting ? 'Applying...' : 'Commit Seat Adjustment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Modal */}
        {cancelModalOpen && selectedSub && (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#333] rounded-xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-sm font-bold text-white">Cancel Subscription</h3>
              <p className="text-xs text-gray-400">
                Choose whether to terminate immediately with a prorated credit note or expire at the end of the current billing cycle.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Cancellation Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCancelType('immediate')}
                      className={`p-2.5 rounded border text-left text-xs ${
                        cancelType === 'immediate'
                          ? 'bg-rose-950/50 border-rose-700 text-white font-semibold'
                          : 'bg-[#0a0a0a] border-[#333] text-gray-400'
                      }`}
                    >
                      Immediate
                      <span className="block text-[10px] text-gray-400 font-normal mt-0.5">Issues credit note for unused days</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelType('end_of_period')}
                      className={`p-2.5 rounded border text-left text-xs ${
                        cancelType === 'end_of_period'
                          ? 'bg-amber-950/50 border-amber-700 text-white font-semibold'
                          : 'bg-[#0a0a0a] border-[#333] text-gray-400'
                      }`}
                    >
                      End of Period
                      <span className="block text-[10px] text-gray-400 font-normal mt-0.5">Stops auto-renewal; active until end</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Reason for Cancellation</label>
                  <textarea
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Migrating to on-prem enterprise hardware deployment"
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded p-2 text-xs text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#222]">
                <button
                  onClick={() => setCancelModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs border border-[#333] text-gray-300 hover:bg-[#222]"
                >
                  Close
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelSubmitting || cancelReason.trim().length < 3}
                  className="px-4 py-1.5 rounded text-xs bg-rose-600 text-white font-semibold hover:bg-rose-500 disabled:opacity-50 transition"
                >
                  {cancelSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
