'use client';

import React, { useState, useEffect } from 'react';
import { Layers, ShieldAlert, Award, Percent, Edit3, RefreshCw, CheckCircle } from 'lucide-react';

interface CustomerTier {
  id: string;
  name: string;
  code: string;
  maxDiscountPct: number;
  approvalThresholdPct: number;
  description?: string;
  createdAt: string;
}

export default function CustomerTiersPage() {
  const [tiers, setTiers] = useState<CustomerTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<CustomerTier | null>(null);
  const [newCeiling, setNewCeiling] = useState('');
  const [newThreshold, setNewThreshold] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('admin');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role) setUserRole(parsed.role);
      }
    } catch {}
  }, []);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/sales/customer-tiers`);
      if (!res.ok) throw new Error('Failed to load customer tiers');
      const json = await res.json();
      setTiers(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  const openEditModal = (tier: CustomerTier) => {
    setEditingTier(tier);
    setNewCeiling(tier.maxDiscountPct.toString());
    setNewThreshold(tier.approvalThresholdPct.toString());
  };

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;

    try {
      setSaving(true);
      const res = await fetch(`${apiUrl}/sales/customer-tiers/${editingTier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxDiscountPct: parseFloat(newCeiling),
          approvalThresholdPct: parseFloat(newThreshold),
        }),
      });

      if (!res.ok) throw new Error('Failed to update tier');
      setSuccessMsg(`Successfully updated ${editingTier.name} tier ceilings`);
      setTimeout(() => setSuccessMsg(null), 3500);
      setEditingTier(null);
      fetchTiers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Customer Tiers & Discount Ceilings</h2>
          <p className="text-sm text-slate-400 mt-1">
            Establish pricing governance limits, discretionary sales ceilings, and manager escalation thresholds.
          </p>
        </div>
        <button
          onClick={() => fetchTiers()}
          className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-4 py-16 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-500 mb-2" />
            Loading customer tier matrix...
          </div>
        ) : (
          tiers.map((tier) => {
            const isPlatinum = tier.code === 'PLT';
            const isGold = tier.code === 'GLD';
            const isSilver = tier.code === 'SLV';

            return (
              <div
                key={tier.id}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold font-mono uppercase tracking-wider ${
                        isPlatinum
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          : isGold
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : isSilver
                              ? 'bg-slate-400/10 text-slate-300 border border-slate-400/30'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {tier.code}
                    </span>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => openEditModal(tier)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title="Edit Ceilings"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white mt-3">{tier.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[36px]">{tier.description}</p>

                  <div className="mt-6 space-y-4">
                    {/* Max discount */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400">Max Discount Ceiling</span>
                        <span className="font-bold text-emerald-400">{tier.maxDiscountPct}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, tier.maxDiscountPct * 2.5)}%` }}
                        />
                      </div>
                    </div>

                    {/* Approval threshold */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400">Approval Required At</span>
                        <span className="font-bold text-amber-400">&gt; {tier.approvalThresholdPct}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, tier.approvalThresholdPct * 2.5)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Governance</span>
                  <span className="text-slate-400">Blended Risk Enforced</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Tier Ceilings Modal */}
      {editingTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Adjust {editingTier.name} Ceilings</h3>
              <button
                onClick={() => setEditingTier(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Maximum Discount Percentage (Ceiling)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={newCeiling}
                    onChange={(e) => setNewCeiling(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Manager Approval Trigger Threshold
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500">%</span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Ceilings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
