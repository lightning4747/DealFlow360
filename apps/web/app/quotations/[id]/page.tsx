'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';

export default function QuotationDetailPage() {
  const params = useParams();
  const quoteId = params?.id as string || 'Q-1042';

  const [quote, setQuote] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([
    { id: '1', author: 'Alice Rep', text: 'Offered 18% discount on Onsite Setup to close hardware bundle.', date: '10 mins ago' },
  ]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    async function fetchQuote() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch(`${apiUrl}/sales/quotes/${quoteId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          setQuote(json.data);
        }
      } catch {
        // Fallback default
      }
    }
    fetchQuote();
  }, [quoteId, apiUrl]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setComments((prev) => [
      ...prev,
      { id: String(Date.now()), author: 'You (Sales Rep)', text: comment.trim(), date: 'Just now' },
    ]);
    setComment('');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[#222] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-white">Quotation: {quoteId}</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-amber-800 bg-amber-950/40 text-amber-400">
                PENDING APPROVAL
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Customer: Acme Corp • Owner: Alice Rep</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/portal/quotes/magic-demo-token-1042`}
              target="_blank"
              className="px-3 py-1.5 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition"
            >
              Open Customer Portal View ↗
            </Link>
          </div>
        </div>

        {/* Stage Progress Bar matching Excalidraw */}
        <div className="p-4 rounded-lg border border-[#222] bg-[#0d0d0d] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-300">
            <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center font-bold text-[10px]">1</span>
            <span>Draft</span>
          </div>
          <div className="h-[1px] flex-1 bg-white/20 mx-3" />
          <div className="flex items-center gap-2 text-white font-semibold">
            <span className="w-5 h-5 rounded-full border border-white bg-white/20 text-white flex items-center justify-center text-[10px]">2</span>
            <span>Pending Approval</span>
          </div>
          <div className="h-[1px] flex-1 bg-[#222] mx-3" />
          <div className="flex items-center gap-2 text-gray-500">
            <span className="w-5 h-5 rounded-full border border-[#333] flex items-center justify-center text-[10px]">3</span>
            <span>Sent</span>
          </div>
          <div className="h-[1px] flex-1 bg-[#222] mx-3" />
          <div className="flex items-center gap-2 text-gray-500">
            <span className="w-5 h-5 rounded-full border border-[#333] flex items-center justify-center text-[10px]">4</span>
            <span>Negotiation</span>
          </div>
          <div className="h-[1px] flex-1 bg-[#222] mx-3" />
          <div className="flex items-center gap-2 text-gray-500">
            <span className="w-5 h-5 rounded-full border border-[#333] flex items-center justify-center text-[10px]">5</span>
            <span>Confirmed</span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#222] bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-medium">Product</th>
                <th className="py-3 px-4 font-medium">Qty</th>
                <th className="py-3 px-4 font-medium">Price</th>
                <th className="py-3 px-4 font-medium">Discount</th>
                <th className="py-3 px-4 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              <tr className="hover:bg-[#181818] transition-colors">
                <td className="py-3 px-4 font-medium text-white">Laptop Pro 14</td>
                <td className="py-3 px-4">2</td>
                <td className="py-3 px-4 font-mono text-gray-300">$1,250.00</td>
                <td className="py-3 px-4 font-mono text-gray-300">12%</td>
                <td className="py-3 px-4 font-mono text-white">$2,200.00</td>
              </tr>
              <tr className="hover:bg-[#181818] transition-colors">
                <td className="py-3 px-4 font-medium text-white">Onsite Setup Service</td>
                <td className="py-3 px-4">1</td>
                <td className="py-3 px-4 font-mono text-gray-300">$450.00</td>
                <td className="py-3 px-4 font-mono text-red-400">18% (Over limit)</td>
                <td className="py-3 px-4 font-mono text-white">$369.00</td>
              </tr>
              <tr className="hover:bg-[#181818] transition-colors">
                <td className="py-3 px-4 font-medium text-white">Docking Station</td>
                <td className="py-3 px-4">2</td>
                <td className="py-3 px-4 font-mono text-gray-300">$180.00</td>
                <td className="py-3 px-4 font-mono text-gray-300">0%</td>
                <td className="py-3 px-4 font-mono text-white">$360.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Real-time Deal Studio Redlining & Comments */}
        <div className="p-5 rounded-lg border border-[#222] bg-[#0c0c0c] space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
            Real-Time Deal Studio Thread & Redlining
          </h3>

          <div className="space-y-2.5">
            {comments.map((c) => (
              <div key={c.id} className="p-3 rounded border border-[#222] bg-[#121212] text-xs">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="font-semibold text-gray-200">{c.author}</span>
                  <span>{c.date}</span>
                </div>
                <p className="text-gray-300">{c.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Add note or justification for discount approval..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1 bg-[#141414] border border-[#333] px-3 py-1.5 rounded text-xs text-white"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition"
            >
              Post Note
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
