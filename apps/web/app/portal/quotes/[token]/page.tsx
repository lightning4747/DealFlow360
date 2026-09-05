'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

export default function CustomerPortalNegotiationPage() {
  const params = useParams();
  const token = (params?.token as string) || 'demo-token';

  const [quote, setQuote] = useState<any>(null);
  const [counterDiscount, setCounterDiscount] = useState<number>(15);
  const [customerComment, setCustomerComment] = useState('');
  const [comments, setComments] = useState<any[]>([
    {
      id: '1',
      participantName: 'Procurement (Buyer)',
      notes: 'Can this be 15% all upfront if we sign this month?',
      date: 'Aug 22',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [liveUsers, setLiveUsers] = useState<string[]>(['Customer Procurement']);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  // Connect WebSocket & load sanitized quote
  useEffect(() => {
    async function loadQuote() {
      try {
        const res = await fetch(`${apiUrl}/portal/quotes/view?token=${token}`);
        if (res.ok) {
          const json = await res.json();
          setQuote(json.data);
        } else {
          // Fallback data matching Screen 11 in PNG
          setQuote({
            id: 'qte-1042',
            quoteNumber: 'Q-1042',
            customerName: 'Acme Corp',
            status: 'under_negotiation',
            totalAmount: '2750.00',
            currency: 'USD',
            lines: [
              { id: '1', productName: 'Laptop Pro 14', quantity: 2, unitPrice: '1250.00', discountPct: '12.00', lineTotal: '2200.00' },
              { id: '2', productName: 'Extended Warranty 2yr', quantity: 1, unitPrice: '200.00', discountPct: '10.00', lineTotal: '180.00' },
              { id: '3', productName: 'Onsite Setup Service', quantity: 1, unitPrice: '450.00', discountPct: '18.00', lineTotal: '369.00' },
            ],
          });
        }
      } catch {
        setQuote({
          id: 'qte-1042',
          quoteNumber: 'Q-1042',
          customerName: 'Acme Corp',
          status: 'under_negotiation',
          totalAmount: '2750.00',
          currency: 'USD',
          lines: [
            { id: '1', productName: 'Laptop Pro 14', quantity: 2, unitPrice: '1250.00', discountPct: '12.00', lineTotal: '2200.00' },
            { id: '2', productName: 'Extended Warranty 2yr', quantity: 1, unitPrice: '200.00', discountPct: '10.00', lineTotal: '180.00' },
            { id: '3', productName: 'Onsite Setup Service', quantity: 1, unitPrice: '450.00', discountPct: '18.00', lineTotal: '369.00' },
          ],
        });
      }
    }

    loadQuote();

    // Socket.IO Real-Time Gateway Connection
    let socket: Socket | null = null;
    try {
      socket = io('http://localhost:8000/negotiation', {
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        socket?.emit('joinQuoteRoom', {
          quoteId: 'Q-1042',
          userRole: 'customer',
          userId: 'customer-procurement',
          userName: 'Acme Procurement',
        });
      });

      socket.on('userPresenceChanged', (presence: any) => {
        if (presence?.userName) {
          setLiveUsers((prev) => Array.from(new Set([...prev, presence.userName])));
        }
      });

      socket.on('counterProposalSubmitted', (event: any) => {
        setComments((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            participantName: event.participantName,
            notes: `Counter proposal: ${event.counterDiscountPct}% discount proposed. Notes: ${event.notes || 'None'}`,
            date: 'Just now',
          },
        ]);
      });
    } catch {
      // Safe fallback
    }

    return () => {
      socket?.disconnect();
    };
  }, [token, apiUrl]);

  const handleSubmitCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/portal/quotes/counter?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterDiscountPct: counterDiscount,
          notes: customerComment,
          participantName: 'Acme Procurement',
        }),
      });

      setComments((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          participantName: 'Acme Procurement (You)',
          notes: `${counterDiscount}% counter proposed: ${customerComment || 'Requested revised terms.'}`,
          date: 'Just now',
        },
      ]);
      setCustomerComment('');
    } catch {
      setComments((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          participantName: 'Acme Procurement (You)',
          notes: `${counterDiscount}% counter proposed: ${customerComment || 'Requested revised terms.'}`,
          date: 'Just now',
        },
      ]);
      setCustomerComment('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Customer Portal Top Nav Bar matching PNG Screen 11 */}
      <header className="h-14 border-b border-[#222] bg-[#0c0c0c] px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-6">
          <span className="text-sm font-semibold tracking-tight text-white mr-2">DealFlow360</span>
          <nav className="flex items-center space-x-1">
            <span className="px-3 py-1 rounded text-xs font-semibold bg-white text-black">
              My Quotation
            </span>
            <span className="px-3 py-1 rounded text-xs font-medium text-gray-400">
              Messages
            </span>
            <span className="px-3 py-1 rounded text-xs font-medium text-gray-400">
              Profile
            </span>
          </nav>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Collaboration Room</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[#222] pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Customer Portal Negotiation Screen
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Customer views quotation, enters change request, counters discount by line if needed
            </p>
          </div>
          <span className="px-2.5 py-1 rounded text-xs font-mono border border-amber-900 bg-amber-950/40 text-amber-400">
            STATUS: UNDER NEGOTIATION
          </span>
        </div>

        {/* Quote Line Summary */}
        <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#222] bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-medium">Line Item</th>
                <th className="py-3 px-4 font-medium">Qty</th>
                <th className="py-3 px-4 font-medium">Price</th>
                <th className="py-3 px-4 font-medium">Discount</th>
                <th className="py-3 px-4 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {quote?.lines?.map((line: any) => (
                <tr key={line.id} className="hover:bg-[#181818] transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{line.productName}</td>
                  <td className="py-3 px-4">{line.quantity}</td>
                  <td className="py-3 px-4 font-mono text-gray-300">${parseFloat(line.unitPrice).toFixed(2)}</td>
                  <td className="py-3 px-4 font-mono text-gray-300">{parseFloat(line.discountPct)}%</td>
                  <td className="py-3 px-4 font-mono text-white text-right">${parseFloat(line.lineTotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Counter Offer & Line Redlining Form */}
        <div className="p-5 rounded-lg border border-[#222] bg-[#0c0c0c] space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
            Propose Terms / Counter-Discount
          </h2>

          <form onSubmit={handleSubmitCounter} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Proposed Counter Discount (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={counterDiscount}
                  onChange={(e) => setCounterDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#141414] border border-[#333] px-3 py-1.5 rounded text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Requested Delivery Date</label>
                <input
                  type="date"
                  defaultValue="2026-09-30"
                  className="w-full bg-[#141414] border border-[#333] px-3 py-1.5 rounded text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Customer Comments / Change Request</label>
              <textarea
                rows={3}
                placeholder="Can this be 15% all upfront if we sign this month? We can confirm immediately."
                value={customerComment}
                onChange={(e) => setCustomerComment(e.target.value)}
                className="w-full bg-[#141414] border border-[#333] p-2.5 rounded text-xs text-white resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmed(true)}
                className="px-4 py-2 rounded text-xs font-medium border border-[#333] text-gray-300 hover:bg-[#1a1a1a] transition"
              >
                {confirmed ? '✓ Confirmed' : 'Confirm Quotation'}
              </button>
            </div>
          </form>
        </div>

        {/* Live Conversation Thread */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Negotiation & Redline History
          </h2>
          <div className="space-y-2.5">
            {comments.map((item) => (
              <div key={item.id} className="p-3.5 rounded-lg border border-[#222] bg-[#0f0f0f] text-xs">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="font-semibold text-white">{item.participantName}</span>
                  <span>{item.date}</span>
                </div>
                <p className="text-gray-300">{item.notes}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-500">
          If your terms exceed thresholds, the quote automatically re-enters approval (Screen 5).
        </p>
      </main>
    </div>
  );
}
