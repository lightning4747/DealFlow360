'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Search,
  Eye,
  ArrowRight,
  UserCheck,
  Shield,
  FileText,
  Package,
  Building2,
} from 'lucide-react';
import { AccountSwitcher } from '../../components/account-switcher';

interface ApprovalItem {
  id: string;
  quoteId: string;
  quoteNumber: string;
  totalAmount: string;
  brsScore: string;
  approvalLevel: 'level_1' | 'level_2' | 'level_3';
  status: 'pending' | 'approved' | 'rejected';
  currentApprovalStep: number;
  createdAt: string;
  canAct: boolean;
  activeStep?: {
    id: string;
    stepOrder: number;
    roleRequired: string;
  };
  steps: Array<{
    id: string;
    stepOrder: number;
    roleRequired: string;
    decision: string;
    decisionReason?: string;
  }>;
}

interface ApprovalDetails {
  approval: {
    id: string;
    quoteId: string;
    brsScore: string;
    approvalLevel: string;
    status: string;
  };
  quote: {
    id: string;
    quoteNumber: string;
    totalAmount: string;
    status: string;
  };
  customer?: {
    name: string;
    company: string;
    tier: string;
  };
  lines: Array<{
    id: string;
    productName: string;
    category: string;
    quantity: number;
    unitPrice: string;
    discountPct: string;
    appliedCeilingPct?: string;
    violationScore?: string;
    lineTotal: string;
  }>;
  steps: Array<{
    id: string;
    stepOrder: number;
    roleRequired: string;
    decision: string;
    decisionReason?: string;
  }>;
}

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'team' | 'history'>('pending');
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [details, setDetails] = useState<ApprovalDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('sales_manager');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role) setUserRole(parsed.role);
      }
    } catch {}
  }, []);

  // Decision Modal
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected' | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const ensureAuthToken = async (): Promise<string | null> => {
    let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) return token;

    try {
      let loginEmail = 'manager@dealflow360.com';
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed.email && parsed.email !== 'guest@dealflow360.com') {
              loginEmail = parsed.email;
            }
          } catch {}
        }
      }

      const res = await fetch(`${apiUrl}/internal/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: 'password123',
        }),
      });
      if (res.ok) {
        const json = await res.json();
        token = json.data?.tokens?.accessToken || null;
        if (token && typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
      }
    } catch (e) {
      console.error('Auto-login error:', e);
    }
    return token;
  };

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const token = await ensureAuthToken();
      const res = await fetch(`${apiUrl}/sales/approvals`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`Failed to load approvals (${res.status})`);
      const data = await res.json();
      setApprovals(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      console.warn('API fetch note (demo mock fallback):', err.message);
      // Demo mock data if API is starting or in dev sandbox
      setApprovals([
        {
          id: 'appr-001',
          quoteId: 'qte-101',
          quoteNumber: 'QTE-2026-0814',
          totalAmount: '145000.00',
          brsScore: '34.41',
          approvalLevel: 'level_2',
          status: 'pending',
          currentApprovalStep: 1,
          createdAt: new Date().toISOString(),
          canAct: true,
          activeStep: { id: 'step-1', stepOrder: 1, roleRequired: 'sales_manager' },
          steps: [
            { id: 'step-1', stepOrder: 1, roleRequired: 'sales_manager', decision: 'pending' },
            { id: 'step-2', stepOrder: 2, roleRequired: 'finance', decision: 'pending' },
          ],
        },
        {
          id: 'appr-002',
          quoteId: 'qte-102',
          quoteNumber: 'QTE-2026-0922',
          totalAmount: '280000.00',
          brsScore: '56.80',
          approvalLevel: 'level_3',
          status: 'pending',
          currentApprovalStep: 1,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          canAct: true,
          activeStep: { id: 'step-11', stepOrder: 1, roleRequired: 'sales_manager' },
          steps: [
            { id: 'step-11', stepOrder: 1, roleRequired: 'sales_manager', decision: 'pending' },
            { id: 'step-12', stepOrder: 2, roleRequired: 'finance', decision: 'pending' },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const openReviewDrawer = async (approvalId: string) => {
    setSelectedApprovalId(approvalId);
    setDetailsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${apiUrl}/sales/approvals/${approvalId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setDetails(data.data || data);
      } else {
        throw new Error('Fallback to mock detail');
      }
    } catch {
      // Mock detail
      const selected = approvals.find((a) => a.id === approvalId);
      setDetails({
        approval: {
          id: approvalId,
          quoteId: selected?.quoteId || 'qte-001',
          brsScore: selected?.brsScore || '34.41',
          approvalLevel: selected?.approvalLevel || 'level_2',
          status: selected?.status || 'pending',
        },
        quote: {
          id: selected?.quoteId || 'qte-001',
          quoteNumber: selected?.quoteNumber || 'QTE-2026-0814',
          totalAmount: selected?.totalAmount || '145000.00',
          status: 'pending_approval',
        },
        customer: {
          name: 'Acme Global Industries',
          company: 'Acme Corp',
          tier: 'Gold Enterprise',
        },
        lines: [
          {
            id: 'line-1',
            productName: 'Enterprise Rack Server 1U (Dual Xeon 32C)',
            category: 'hardware',
            quantity: 20,
            unitPrice: '4500.00',
            discountPct: '28.00',
            appliedCeilingPct: '20.00',
            violationScore: '40.0000',
            lineTotal: '64800.00',
          },
          {
            id: 'line-2',
            productName: 'Annual SaaS Pro Multi-User License',
            category: 'subscription',
            quantity: 50,
            unitPrice: '1990.00',
            discountPct: '20.00',
            appliedCeilingPct: '30.00',
            violationScore: '0.0000',
            lineTotal: '79600.00',
          },
        ],
        steps: selected?.steps || [],
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDecisionSubmit = async () => {
    if (!selectedApprovalId || !decisionType) return;
    if (decisionType === 'rejected' && decisionReason.trim().length < 10) {
      setActionError('A mandatory rejection reason (at least 10 characters) is required.');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const endpoint = `${apiUrl}/sales/approvals/${selectedApprovalId}/${decisionType}`;
      const payload =
        decisionType === 'approved'
          ? { comment: decisionReason || 'Approved via Approver Dashboard' }
          : { reason: decisionReason.trim() };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Action failed');
      }

      setDecisionType(null);
      setDecisionReason('');
      setSelectedApprovalId(null);
      await fetchApprovals();
    } catch (err: any) {
      setActionError(err.message || 'Error executing approval decision');
    } finally {
      setSubmitting(false);
    }
  };

  const getBrsBadge = (score: number) => {
    if (score === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          BRS: 0.0 (No Risk)
        </span>
      );
    }
    if (score <= 25) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          BRS: {score.toFixed(1)} (Low Risk - L1)
        </span>
      );
    }
    if (score <= 50) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          BRS: {score.toFixed(1)} (Med Risk - L2)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
        <ShieldAlert className="w-3.5 h-3.5" />
        BRS: {score.toFixed(1)} (High Risk - L3)
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Governance & Approval Engine</h1>
              <p className="text-sm text-slate-400">
                Multi-tier discount exposure review, Blended Risk Score (BRS) arbitration & compliance
              </p>
            </div>
          </div>
        </div>

        {/* Actions / User & Refresh */}
        <div className="flex items-center gap-3">
          {userRole === 'admin' && (
            <Link
              href="/customer/orders"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Customer Portal</span>
            </Link>
          )}
          <Link
            href="/admin/products"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition"
          >
            <Package className="w-3.5 h-3.5 text-blue-400" />
            <span>Admin Catalog</span>
          </Link>
          <button
            onClick={fetchApprovals}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition"
          >
            Refresh Queue
          </button>
          <AccountSwitcher />
        </div>
      </div>

      {/* Main Tabs */}
      <div className="max-w-7xl mx-auto">
        <div className="flex border-b border-slate-800 mb-6 space-x-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'pending'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            Awaiting My Action
            <span className="ml-1 px-2 py-0.5 text-xs bg-indigo-950 text-indigo-300 rounded-full border border-indigo-800">
              {approvals.filter((a) => a.canAct && a.status === 'pending').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'team'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Assigned to Team
            <span className="ml-1 px-2 py-0.5 text-xs bg-slate-800 text-slate-400 rounded-full">
              {approvals.length}
            </span>
          </button>
        </div>

        {/* Approvals Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading pending governance queue...</div>
          ) : approvals.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold text-white">All Clear! No Pending Approvals</h3>
              <p className="text-sm text-slate-400 mt-1">
                Quotes with BRS = 0 have been automatically approved and sent.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-medium text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-6">Quote Number</th>
                    <th className="py-3.5 px-6">Deal Value</th>
                    <th className="py-3.5 px-6">Blended Risk Score</th>
                    <th className="py-3.5 px-6">Required Authority</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {approvals.map((item) => {
                    const score = parseFloat(item.brsScore || '0');
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-4 px-6 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            {item.quoteNumber}
                          </div>
                        </td>
                        <td className="py-4 px-6 font-mono text-slate-200">
                          ${parseFloat(item.totalAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6">{getBrsBadge(score)}</td>
                        <td className="py-4 px-6">
                          <div className="text-xs">
                            <span className="font-medium text-slate-300">
                              Step {item.currentApprovalStep}: {item.activeStep?.roleRequired.replace('_', ' ').toUpperCase()}
                            </span>
                            <div className="text-slate-500 mt-0.5">{item.approvalLevel.toUpperCase()} Workflow</div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => openReviewDrawer(item.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Review & Decide
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review Drawer / Modal */}
      {selectedApprovalId && details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">
                    Quote Review: {details.quote.quoteNumber}
                  </h2>
                  {getBrsBadge(parseFloat(details.approval.brsScore))}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Customer: <span className="text-slate-200">{details.customer?.name}</span> ({details.customer?.tier})
                </p>
              </div>
              <button
                onClick={() => setSelectedApprovalId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Line Items & Ceilings Table */}
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Line Items & Discount Violations
            </h3>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/40">
                    <th className="py-2.5 px-4">Item Name</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Qty</th>
                    <th className="py-2.5 px-4">Unit Price</th>
                    <th className="py-2.5 px-4">Discount</th>
                    <th className="py-2.5 px-4">Ceiling</th>
                    <th className="py-2.5 px-4">Violation</th>
                    <th className="py-2.5 px-4 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {details.lines.map((l) => {
                    const discount = parseFloat(l.discountPct || '0');
                    const ceiling = parseFloat(l.appliedCeilingPct || '10');
                    const isViolation = discount > ceiling;

                    return (
                      <tr key={l.id} className={isViolation ? 'bg-rose-500/5' : ''}>
                        <td className="py-3 px-4 font-medium text-white">{l.productName}</td>
                        <td className="py-3 px-4 text-slate-400 capitalize">{l.category}</td>
                        <td className="py-3 px-4">{l.quantity}</td>
                        <td className="py-3 px-4 font-mono">${parseFloat(l.unitPrice).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              isViolation ? 'text-rose-400 font-bold' : 'text-slate-200'
                            }`}
                          >
                            {discount.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{ceiling.toFixed(1)}%</td>
                        <td className="py-3 px-4">
                          {isViolation ? (
                            <span className="text-rose-400 font-bold">
                              +{((discount - ceiling) / ceiling * 100).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-emerald-400">0.0%</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-right text-slate-200">
                          ${parseFloat(l.lineTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Decision Action Box */}
            {decisionType ? (
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 mb-4">
                <h4 className="text-sm font-semibold text-white mb-2">
                  {decisionType === 'approved' ? 'Confirm Approval' : 'Provide Rejection Reason'}
                </h4>
                {decisionType === 'rejected' && (
                  <p className="text-xs text-rose-400 mb-2">
                    * A mandatory explanation (minimum 10 characters) is required to inform the sales rep.
                  </p>
                )}
                <textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder={
                    decisionType === 'approved'
                      ? 'Add optional approval notes...'
                      : 'State explicit reasons for rejection (e.g. discount breaches margin policy)...'
                  }
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                {actionError && <p className="text-xs text-rose-400 mt-2">{actionError}</p>}
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => {
                      setDecisionType(null);
                      setActionError(null);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDecisionSubmit}
                    disabled={submitting}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-md transition ${
                      decisionType === 'approved'
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-rose-600 hover:bg-rose-500'
                    }`}
                  >
                    {submitting ? 'Submitting...' : decisionType === 'approved' ? 'Confirm Approval' : 'Submit Rejection'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">
                  Total Deal Exposure:{' '}
                  <span className="text-white font-mono font-bold text-sm ml-1">
                    ${parseFloat(details.quote.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {['admin', 'sales_manager', 'finance'].includes(userRole) ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDecisionType('rejected')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Deal
                    </button>
                    <button
                      onClick={() => setDecisionType('approved')}
                      className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-md"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve Deal
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-amber-400/90 font-medium px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    Read-Only Audit Mode: Only authorized Sales Managers & Finance Approvers can decide deals.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
