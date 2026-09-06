'use client';

import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/app-header';
import { API_BASE_URL, getAuthHeaders } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  invoiceType: string;
  totalAmount: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  currency: string;
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'voided' | 'overdue';
  dueDate: string;
  issuedAt: string;
  paidAt?: string;
  voidedAt?: string;
  voidReason?: string;
}

interface InvoiceDetail extends InvoiceItem {
  items: {
    id: string;
    productName: string;
    description: string;
    quantity: number;
    unitPrice: string;
    discountPct: string;
    totalPrice: string;
    fulfillmentRequired: boolean;
  }[];
  creditNotes: {
    id: string;
    creditNoteNumber: string;
    amount: string;
    reason: string;
    status: string;
    createdAt: string;
  }[];
}

export default function InvoicesPage() {
  const { isLoading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidActionLoading, setVoidActionLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!authLoading) fetchInvoices();
  }, [filterStatus, authLoading]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const url =
        filterStatus === 'all'
          ? `${API_BASE_URL}/internal/invoices`
          : `${API_BASE_URL}/internal/invoices?status=${filterStatus}`;

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch invoices`);
      const json = await res.json();
      setInvoices(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openInvoiceDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`${API_BASE_URL}/internal/invoices/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load invoice details');
      const json = await res.json();
      setSelectedInvoice(json.data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleVoidInvoice = async () => {
    if (!selectedInvoice || !voidReason.trim()) return;
    try {
      setVoidActionLoading(true);
      const res = await fetch(`${API_BASE_URL}/internal/invoices/${selectedInvoice.id}/void`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ voidReason: voidReason.trim() }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to void invoice');
      }
      setVoidDialogOpen(false);
      setVoidReason('');
      await openInvoiceDetail(selectedInvoice.id);
      await fetchInvoices();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setVoidActionLoading(false);
    }
  };

  const downloadInvoicePdf = async () => {
    if (!selectedInvoice) return;
    try {
      setPdfLoading(true);
      const res = await fetch(`${API_BASE_URL}/internal/invoices/${selectedInvoice.id}/pdf`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to download invoice PDF`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedInvoice.invoiceNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">Paid</span>;
      case 'pending':
      case 'sent':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950 text-amber-400 border border-amber-800">Pending</span>;
      case 'voided':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950 text-rose-400 border border-rose-800">Voided</span>;
      case 'overdue':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-950 text-red-400 border border-red-800">Overdue</span>;
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
            <h1 className="text-xl font-bold tracking-tight text-white">Invoices & Receivables</h1>
            <p className="text-xs text-gray-400 mt-1">
              Deterministic AR tracking for one-time fulfillment lines, recurring subscriptions, and proration charges.
            </p>
          </div>
          <button
            onClick={() => fetchInvoices()}
            className="px-3 py-1.5 rounded text-xs bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-gray-300 font-medium transition"
          >
            Refresh
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2">
          {['all', 'pending', 'paid', 'voided'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded text-xs border transition capitalize ${
                filterStatus === status
                  ? 'bg-white text-black font-semibold border-white'
                  : 'bg-[#111] text-gray-400 border-[#333] hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Invoices Table */}
        <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading invoices...</div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-rose-400">{error}</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">No invoices found for this filter.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#222] bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-medium">Invoice #</th>
                  <th className="py-3 px-4 font-medium">Customer</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">Amount</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Due Date</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e1e]">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => openInvoiceDetail(inv.id)}
                    className="hover:bg-[#181818] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-white">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 text-gray-300">{inv.customerName || 'Enterprise Account'}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono capitalize">{inv.invoiceType.replace('_', ' ')}</td>
                    <td className="py-3 px-4 font-mono text-white font-medium">
                      ${parseFloat(inv.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(inv.status)}</td>
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openInvoiceDetail(inv.id);
                        }}
                        className="text-xs text-gray-300 hover:text-white underline font-mono"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#111] border border-[#333] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#222] pb-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-bold text-white font-mono">{selectedInvoice.invoiceNumber}</h2>
                    {getStatusBadge(selectedInvoice.status)}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Customer: {selectedInvoice.customerName || 'Enterprise Account'} | Type: {selectedInvoice.invoiceType}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-gray-400 hover:text-white text-sm px-2 py-1 border border-[#333] rounded bg-[#181818]"
                >
                  ✕ Close
                </button>
              </div>

              {/* Meta Stats */}
              <div className="grid grid-cols-3 gap-4 bg-[#161616] p-4 rounded-lg border border-[#262626]">
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block">Total Due</span>
                  <span className="text-base font-bold text-white font-mono">
                    ${parseFloat(selectedInvoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block">Due Date</span>
                  <span className="text-xs text-gray-200 block mt-1">
                    {new Date(selectedInvoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-400 block">Issued At</span>
                  <span className="text-xs text-gray-200 block mt-1">
                    {selectedInvoice.issuedAt ? new Date(selectedInvoice.issuedAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {selectedInvoice.status === 'voided' && (
                <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded text-xs text-rose-300">
                  <span className="font-semibold">Voided on {selectedInvoice.voidedAt ? new Date(selectedInvoice.voidedAt).toLocaleDateString() : 'N/A'}:</span>{' '}
                  {selectedInvoice.voidReason || 'No void reason recorded'}
                </div>
              )}

              {/* Line Items */}
              <div>
                <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Itemized Breakdown</h3>
                <div className="border border-[#262626] rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#181818] border-b border-[#262626] text-gray-400 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Qty</th>
                        <th className="py-2.5 px-3">Unit Price</th>
                        <th className="py-2.5 px-3">Discount</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222]">
                      {selectedInvoice.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2 px-3 text-white">{item.description}</td>
                          <td className="py-2 px-3 text-gray-300 font-mono">{item.quantity}</td>
                          <td className="py-2 px-3 text-gray-300 font-mono">${parseFloat(item.unitPrice).toFixed(2)}</td>
                          <td className="py-2 px-3 text-gray-400 font-mono">{parseFloat(item.discountPct).toFixed(1)}%</td>
                          <td className="py-2 px-3 text-right text-white font-mono font-medium">${parseFloat(item.totalPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Credit Notes if any */}
              {selectedInvoice.creditNotes && selectedInvoice.creditNotes.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Associated Credit Notes</h3>
                  <div className="space-y-2">
                    {selectedInvoice.creditNotes.map((cn) => (
                      <div key={cn.id} className="p-3 bg-[#181818] border border-[#2a2a2a] rounded flex justify-between items-center text-xs">
                        <div>
                          <span className="font-mono font-bold text-amber-400 mr-2">{cn.creditNoteNumber}</span>
                          <span className="text-gray-300">{cn.reason}</span>
                        </div>
                        <span className="font-mono font-bold text-white">-${parseFloat(cn.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-[#222] pt-4">
                <div className="flex space-x-2">
                  <button
                    onClick={downloadInvoicePdf}
                    disabled={pdfLoading}
                    className="px-3 py-1.5 rounded text-xs bg-white text-black font-semibold hover:bg-gray-200 transition"
                  >
                    {pdfLoading ? 'Preparing PDF...' : 'Download PDF'}
                  </button>
                </div>
                {selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'voided' && (
                  <button
                    onClick={() => setVoidDialogOpen(true)}
                    className="px-3 py-1.5 rounded text-xs bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 transition font-medium"
                  >
                    Void Invoice
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Void Dialog */}
        {voidDialogOpen && selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#333] rounded-xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-sm font-bold text-white">Void Invoice {selectedInvoice.invoiceNumber}</h3>
              <p className="text-xs text-gray-400">
                Voiding will cancel all accounts receivable claims for this invoice. A non-empty reason is mandatory for financial audit logging.
              </p>
              <div>
                <label className="block text-[11px] uppercase text-gray-400 font-medium mb-1">Reason for Voiding</label>
                <textarea
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Terms renegotiated in revised master service agreement"
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setVoidDialogOpen(false)}
                  className="px-3 py-1.5 rounded text-xs border border-[#333] text-gray-300 hover:bg-[#222]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVoidInvoice}
                  disabled={voidActionLoading || voidReason.trim().length < 5}
                  className="px-3 py-1.5 rounded text-xs bg-rose-600 text-white font-semibold hover:bg-rose-500 disabled:opacity-50 transition"
                >
                  {voidActionLoading ? 'Voiding...' : 'Confirm Void'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
