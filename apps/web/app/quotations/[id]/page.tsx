'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { useAuth } from '@/lib/auth-context';
import { getAuthHeaders, API_BASE_URL } from '@/lib/api-client';

interface QuoteLineItem {
  id: string;
  productId: string;
  productName?: string;
  category?: string;
  quantity: number;
  unitPrice: string;
  discountPct: string;
  appliedCeilingPct?: string;
  lineTotal: string;
  lineType: string;
  comments?: any[];
}

interface FullQuoteDetail {
  id: string;
  quoteNumber: string;
  status: string;
  totalAmount: string;
  costTotal: string;
  grossMarginPct: string;
  brsScore: string;
  blendedRiskScore?: string;
  currentApprovalStep: number;
  customerName?: string;
  customerCompany?: string;
  customerTier?: string;
  repName?: string;
  createdAt: string;
  lines: QuoteLineItem[];
}

const STAGES = ['draft', 'sent', 'under_negotiation', 'pending_approval', 'confirmed'];
const STAGE_LABELS = ['1. Draft', '2. Customer Sent', '3. Negotiation', '4. Governance Approval', '5. Confirmed'];

export default function QuotationDetailPage() {
  const params = useParams();
  const quoteId = (params?.id as string) || '';
  const { user } = useAuth();

  const [quote, setQuote] = useState<FullQuoteDetail | null>(null);
  const [commentText, setCommentText] = useState('');
  const [targetLineId, setTargetLineId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  const fetchQuoteDetail = async () => {
    if (!quoteId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/sales/quotes/${quoteId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setQuote(json.data);
        if (json.data?.lines?.length > 0 && !targetLineId) {
          setTargetLineId(json.data.lines[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load quote details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuoteDetail();
  }, [quoteId, user]);

  const handleGeneratePortalLink = async () => {
    if (!quote) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/portal/auth/magic-link/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.id,
          email: 'customer@client.com',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const url = json.data?.portalUrl || `/portal/quotes/${json.data?.token}`;
        setPortalUrl(url);
        setStatusMessage(`Customer Portal link ready: ${window.location.origin}${url}`);
      } else {
        setStatusMessage('Could not generate customer portal link');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Error generating link');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!quote) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/sales/quotes/${quote.id}/submit`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setStatusMessage('Quotation submitted for approval!');
        await fetchQuoteDetail();
      } else {
        const errJson = await res.json().catch(() => null);
        setStatusMessage(errJson?.message || 'Could not submit quote for approval');
      }
    } catch (e: any) {
      setStatusMessage(e.message || 'Submission error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !targetLineId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/sales/quotes/lines/${targetLineId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          comment: commentText.trim(),
        }),
      });

      if (res.ok) {
        setCommentText('');
        await fetchQuoteDetail();
      }
    } catch (err) {
      console.error('Comment error:', err);
    }
  };

  const currentStageIndex = STAGES.indexOf(quote?.status?.toLowerCase() || 'draft');

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#222] pb-4 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Quotation: {quote?.quoteNumber || quoteId}
              </h1>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono border uppercase ${
                quote?.status === 'pending_approval'
                  ? 'border-amber-800 bg-amber-950/40 text-amber-400'
                  : quote?.status === 'confirmed'
                  ? 'border-emerald-800 bg-emerald-950/40 text-emerald-400'
                  : 'border-[#333] bg-[#111] text-gray-300'
              }`}>
                {quote?.status?.replace('_', ' ') || 'DRAFT'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Customer: <span className="text-white font-medium">{quote?.customerName || quote?.customerCompany || 'Enterprise Account'}</span> • Tier: <span className="text-white font-mono uppercase">{quote?.customerTier || 'STD'}</span> • Owner: {quote?.repName || 'Sales Rep'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGeneratePortalLink}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded text-xs font-medium border border-[#333] text-gray-200 hover:bg-[#1a1a1a] transition disabled:opacity-50"
            >
              {actionLoading ? 'Generating...' : 'Customer Portal Link'}
            </button>
            {portalUrl && (
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition"
              >
                Open Portal ↗
              </a>
            )}
            {(quote?.status === 'draft' || quote?.status === 'under_negotiation') && (
              <button
                type="button"
                onClick={handleSubmitForApproval}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition disabled:opacity-50"
              >
                {actionLoading ? 'Submitting...' : 'Submit for Governance Approval'}
              </button>
            )}
            <Link
              href="/quotations"
              className="px-3 py-1.5 rounded text-xs font-medium border border-[#333] text-gray-300 hover:bg-[#1a1a1a] transition"
            >
              ← Back to Pipeline
            </Link>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 bg-[#111] border border-[#333] rounded-lg text-xs text-gray-200 flex items-center justify-between">
            <span>{statusMessage}</span>
            {portalUrl && (
              <a href={portalUrl} target="_blank" rel="noreferrer" className="underline text-white font-mono ml-3">
                Visit Link
              </a>
            )}
          </div>
        )}

        {/* 5-Stage Progression Rail */}
        <div className="p-4 rounded-lg border border-[#222] bg-[#0d0d0d] flex items-center justify-between text-xs">
          {STAGE_LABELS.map((stageLabel, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex || (currentStageIndex === -1 && idx === 0);

            return (
              <React.Fragment key={stageLabel}>
                <div className={`flex items-center gap-2 ${isCurrent ? 'text-white font-semibold' : isCompleted ? 'text-gray-300' : 'text-gray-500'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                    isCurrent
                      ? 'bg-white text-black'
                      : isCompleted
                      ? 'border border-gray-400 text-gray-200'
                      : 'border border-[#333] text-gray-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <span>{stageLabel}</span>
                </div>
                {idx < 4 && (
                  <div className={`h-[1px] flex-1 mx-3 ${isCompleted ? 'bg-white/30' : 'bg-[#222]'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Line Items Ledger */}
        <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#222] bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-medium">Product Name</th>
                <th className="py-3 px-4 font-medium">Type</th>
                <th className="py-3 px-4 font-medium">Qty</th>
                <th className="py-3 px-4 font-medium">Unit Price</th>
                <th className="py-3 px-4 font-medium">Discount</th>
                <th className="py-3 px-4 font-medium text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {!quote?.lines || quote.lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No line items found for this quotation.
                  </td>
                </tr>
              ) : (
                quote.lines.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setTargetLineId(l.id)}
                    className={`hover:bg-[#181818] transition-colors cursor-pointer ${
                      targetLineId === l.id ? 'bg-[#151515]' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-medium text-white">
                      {l.productName || 'Hardware SKU'}
                      {targetLineId === l.id && (
                        <span className="ml-2 text-[10px] text-gray-400 font-mono">(selected for notes)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400 uppercase text-[10px]">{l.lineType.replace('_', ' ')}</td>
                    <td className="py-3 px-4 font-mono text-gray-300">{l.quantity}</td>
                    <td className="py-3 px-4 font-mono text-gray-300">
                      ${parseFloat(l.unitPrice || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-gray-300">{parseFloat(l.discountPct || '0')}%</span>
                      {parseFloat(l.discountPct || '0') > parseFloat(l.appliedCeilingPct || '15') && (
                        <span className="ml-1.5 text-[10px] text-red-400 font-mono">(over limit)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-white text-right">
                      ${parseFloat(l.lineTotal || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Commercial Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg border border-[#222] bg-[#0c0c0c]">
          <div>
            <div className="text-[11px] text-gray-400">Total Contract Value</div>
            <div className="text-base font-bold font-mono text-white mt-0.5">
              ${parseFloat(quote?.totalAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-400">Cost of Goods (COGS)</div>
            <div className="text-base font-mono text-gray-300 mt-0.5">
              ${parseFloat(quote?.costTotal || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-400">Gross Margin %</div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
              {parseFloat(quote?.grossMarginPct || '0').toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-400">Blended Risk Score</div>
            <div className="text-base font-mono text-gray-300 mt-0.5">
              {quote?.brsScore || quote?.blendedRiskScore || '0.00'}
            </div>
          </div>
        </div>

        {/* Redline Thread & Discussion */}
        <div className="p-5 rounded-lg border border-[#222] bg-[#0c0c0c] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
              Line Redlining &amp; Discussion Thread
            </h3>
            <span className="text-[11px] text-gray-400 font-mono">
              Selected Line: {quote?.lines.find((l) => l.id === targetLineId)?.productName || 'First Line'}
            </span>
          </div>

          <div className="space-y-2.5">
            {quote?.lines
              .flatMap((l) => (l.comments || []).map((c: any) => ({ ...c, productName: l.productName })))
              .map((c: any) => (
                <div key={c.id} className="p-3 rounded border border-[#222] bg-[#121212] text-xs">
                  <div className="flex items-center justify-between text-gray-400 mb-1">
                    <span className="font-semibold text-gray-200">
                      {c.authorName || 'Sales User'} ({c.authorRole || 'sales_rep'}) • <span className="text-gray-400">{c.productName}</span>
                    </span>
                    <span className="text-[10px]">{new Date(c.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-gray-300">{c.comment}</p>
                </div>
              ))}
          </div>

          <form onSubmit={handlePostComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Add justification or note to the selected line item..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 bg-[#141414] border border-[#333] px-3 py-2 rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="px-4 py-2 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition disabled:opacity-50"
            >
              Post Note
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
