'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';

interface ProductItem {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  unitCost: number;
}

interface QuoteLine {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountPct: number;
  lineType: 'one_time' | 'recurring';
}

interface RecommendationItem {
  id: string;
  recommendedProductId: string;
  type: string;
  recommendedProduct: {
    id: string;
    name: string;
    category: string;
    basePrice: string;
    unitCost: string;
  };
}

export default function NewQuotationPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [customerTier, setCustomerTier] = useState<'bronze' | 'silver' | 'gold' | 'platinum'>('silver');
  const [summary, setSummary] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  // Load available catalog products
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch(`${apiUrl}/sales/products?limit=50`);
        if (res.ok) {
          const json = await res.json();
          setProducts(
            (json.data || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              basePrice: parseFloat(p.basePrice || '0'),
              unitCost: parseFloat(p.unitCost || '0'),
            }))
          );
        } else {
          // Default fallbacks for demo
          setProducts([
            { id: '11111111-1111-1111-1111-111111111111', name: 'Laptop Pro 14', category: 'hardware', basePrice: 1250, unitCost: 850 },
            { id: '22222222-2222-2222-2222-222222222222', name: 'Onsite Setup Service', category: 'services', basePrice: 450, unitCost: 150 },
            { id: '33333333-3333-3333-3333-333333333333', name: 'Docking Station', category: 'hardware', basePrice: 180, unitCost: 90 },
            { id: '44444444-4444-4444-4444-444444444444', name: 'Care Plan 2yr', category: 'subscription', basePrice: 45, unitCost: 10 },
          ]);
        }
      } catch {
        setProducts([
          { id: '11111111-1111-1111-1111-111111111111', name: 'Laptop Pro 14', category: 'hardware', basePrice: 1250, unitCost: 850 },
          { id: '22222222-2222-2222-2222-222222222222', name: 'Onsite Setup Service', category: 'services', basePrice: 450, unitCost: 150 },
          { id: '33333333-3333-3333-3333-333333333333', name: 'Docking Station', category: 'hardware', basePrice: 180, unitCost: 90 },
          { id: '44444444-4444-4444-4444-444444444444', name: 'Care Plan 2yr', category: 'subscription', basePrice: 45, unitCost: 10 },
        ]);
      }
    }
    loadProducts();
  }, [apiUrl]);

  // Recalculate margins and fetch upsell recommendations when lines change
  useEffect(() => {
    if (lines.length === 0) {
      setSummary(null);
      setRecommendations([]);
      return;
    }

    async function recalculate() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const calcRes = await fetch(`${apiUrl}/sales/quotes/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            customerTier,
            lines: lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              unitCost: l.unitCost,
              discountPct: l.discountPct,
              lineType: l.lineType,
            })),
          }),
        });

        if (calcRes.ok) {
          const json = await calcRes.json();
          setSummary(json.data);
        } else {
          // Client-side fallback calculation
          let subtotal = 0;
          let totalCost = 0;
          let discountTotal = 0;
          const calculatedLines = lines.map((l) => {
            const lineSub = l.quantity * l.unitPrice;
            const lineDisc = lineSub * (l.discountPct / 100);
            const lineTot = lineSub - lineDisc;
            const lineCost = l.quantity * l.unitCost;
            subtotal += lineSub;
            discountTotal += lineDisc;
            totalCost += lineCost;
            return {
              ...l,
              subtotal: lineSub,
              discountAmount: lineDisc,
              lineTotal: lineTot,
              appliedCeilingPct: 15,
              isCeilingViolated: l.discountPct > 15,
            };
          });
          const totalAmount = subtotal - discountTotal;
          const grossMargin = totalAmount - totalCost;
          const grossMarginPct = totalAmount > 0 ? (grossMargin / totalAmount) * 100 : 0;
          setSummary({
            subtotalAmount: subtotal,
            totalDiscountAmount: discountTotal,
            totalAmount,
            totalCost,
            grossMarginAmount: grossMargin,
            grossMarginPct,
            marginHealth: grossMarginPct >= 35 ? 'healthy' : grossMarginPct >= 20 ? 'caution' : 'critical',
            brsScore: 0,
            requiresApproval: lines.some((l) => l.discountPct > 15),
            approvalLevel: lines.some((l) => l.discountPct > 20) ? 'level_2' : lines.some((l) => l.discountPct > 15) ? 'level_1' : 'none',
            lines: calculatedLines,
          });
        }

        // Fetch Recommendations
        const recRes = await fetch(`${apiUrl}/sales/recommendations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            productIds: lines.map((l) => l.productId),
          }),
        });
        if (recRes.ok) {
          const recJson = await recRes.json();
          setRecommendations(recJson.data || []);
        }
      } catch {
        // Safe fallback
      }
    }

    recalculate();
  }, [lines, customerTier, apiUrl]);

  const addProductToQuote = (product: ProductItem) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          category: product.category,
          quantity: 1,
          unitPrice: product.basePrice,
          unitCost: product.unitCost,
          discountPct: 0,
          lineType: product.category === 'subscription' ? 'recurring' : 'one_time',
        },
      ];
    });
  };

  const updateLineDiscount = (index: number, discountPct: number) => {
    setLines((prev) =>
      prev.map((l, idx) => (idx === index ? { ...l, discountPct: Math.min(100, Math.max(0, discountPct)) } : l))
    );
  };

  const updateLineQuantity = (index: number, quantity: number) => {
    setLines((prev) =>
      prev.map((l, idx) => (idx === index ? { ...l, quantity: Math.max(1, quantity) } : l))
    );
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateQuote = async () => {
    if (lines.length === 0) return;
    setSaving(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${apiUrl}/sales/quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customerId: 'a0000000-0000-0000-0000-000000000001',
          lines: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            unitCost: l.unitCost,
            discountPct: l.discountPct,
            lineType: l.lineType,
          })),
        }),
      });

      if (res.ok) {
        const json = await res.json();
        router.push(`/quotations/${json.data?.id || 'Q-1042'}`);
      } else {
        router.push('/quotations');
      }
    } catch {
      router.push('/quotations');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[#222] pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Quotation Detail: Q-1042 (Acme Corp)</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Opened by clicking a row on the Quotations list. Add products, apply discounts, review upsells.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Customer Tier:</span>
            <select
              value={customerTier}
              onChange={(e: any) => setCustomerTier(e.target.value)}
              className="bg-[#111] border border-[#333] text-white text-xs px-2.5 py-1 rounded"
            >
              <option value="bronze">Bronze (5% max)</option>
              <option value="silver">Silver (10% max)</option>
              <option value="gold">Gold (15% max)</option>
              <option value="platinum">Platinum (20% max)</option>
            </select>
          </div>
        </div>

        {/* Product Picker Quick Shelf */}
        <div className="p-4 rounded-lg border border-[#222] bg-[#0c0c0c] space-y-2">
          <div className="text-xs font-semibold text-gray-300">Catalog Quick-Add</div>
          <div className="flex flex-wrap gap-2">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addProductToQuote(p)}
                className="px-3 py-1.5 rounded text-xs border border-[#2e2e2e] bg-[#141414] hover:bg-[#1f1f1f] text-gray-200 transition"
              >
                + {p.name} (${p.basePrice})
              </button>
            ))}
          </div>
        </div>

        {/* Quote Line Items Ledger Table from PNG Screen 4 */}
        <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#222] bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-medium">Product</th>
                <th className="py-3 px-4 font-medium">Qty</th>
                <th className="py-3 px-4 font-medium">Price</th>
                <th className="py-3 px-4 font-medium">Discount</th>
                <th className="py-3 px-4 font-medium">Limit</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No items in quote. Click a product above to begin.
                  </td>
                </tr>
              ) : (
                lines.map((line, idx) => {
                  const calcLine = summary?.lines?.[idx];
                  const isViolation = calcLine?.isCeilingViolated;

                  return (
                    <tr key={idx} className="hover:bg-[#181818] transition-colors">
                      <td className="py-3 px-4 text-white font-medium">{line.name}</td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => updateLineQuantity(idx, parseInt(e.target.value) || 1)}
                          className="w-14 bg-[#141414] border border-[#333] px-2 py-0.5 rounded text-xs font-mono text-white text-center"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-300">${line.unitPrice.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={line.discountPct}
                            onChange={(e) => updateLineDiscount(idx, parseFloat(e.target.value) || 0)}
                            className="w-14 bg-[#141414] border border-[#333] px-2 py-0.5 rounded text-xs font-mono text-white text-center"
                          />
                          <span className="text-gray-400">%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-400 font-mono">
                        {calcLine?.appliedCeilingPct ?? 15}%
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                            isViolation
                              ? 'border-red-900 bg-red-950/40 text-red-400'
                              : 'border-emerald-900 bg-emerald-950/40 text-emerald-400'
                          }`}
                        >
                          {isViolation ? 'OVER (r-Iyer)' : 'OK'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => removeLine(idx)}
                          className="text-gray-500 hover:text-red-400 text-xs transition"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-500">
          Discount is checked against each item's tier/category limit, as soon as it is entered, not only at submit time.
        </p>

        {/* Live Calculation Margin Bar */}
        {summary && (
          <div className="p-4 rounded-lg border border-[#222] bg-[#0c0c0c] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-[11px] text-gray-400 uppercase">Subtotal</span>
                <div className="text-base font-mono font-bold text-white">${summary.subtotalAmount.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 uppercase">Discount</span>
                <div className="text-base font-mono font-bold text-gray-300">-${summary.totalDiscountAmount.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 uppercase">Net Total</span>
                <div className="text-base font-mono font-bold text-white">${summary.totalAmount.toFixed(2)}</div>
              </div>
              <div className="border-l border-[#222] pl-6">
                <span className="text-[11px] text-gray-400 uppercase">Gross Margin</span>
                <div className={`text-base font-mono font-bold ${summary.marginHealth === 'healthy' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {summary.grossMarginPct.toFixed(1)}% (${summary.grossMarginAmount.toFixed(2)})
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-gray-400 uppercase">Governance Gate</span>
              <div className="text-xs font-mono text-gray-300 mt-0.5">
                {summary.requiresApproval ? (
                  <span className="text-amber-400 font-semibold">Requires {summary.approvalLevel.toUpperCase()} Approval</span>
                ) : (
                  <span className="text-emerald-400 font-semibold">Auto-Approved (Within Limits)</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upsell and Cross-Sell Suggestions from PNG Screen 4 */}
        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Upsell and Cross-Sell Suggestions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recommendations.length > 0 ? (
              recommendations.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() =>
                    addProductToQuote({
                      id: rec.recommendedProduct.id,
                      name: rec.recommendedProduct.name,
                      category: rec.recommendedProduct.category,
                      basePrice: parseFloat(rec.recommendedProduct.basePrice),
                      unitCost: parseFloat(rec.recommendedProduct.unitCost),
                    })
                  }
                  className="p-3.5 rounded-lg border border-[#222] bg-[#0f0f0f] hover:border-gray-500 transition cursor-pointer"
                >
                  <div className="text-xs font-medium text-white">+ {rec.recommendedProduct.name}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Margin +18% • ${rec.recommendedProduct.basePrice}</div>
                </div>
              ))
            ) : (
              <>
                <div
                  onClick={() =>
                    addProductToQuote({
                      id: '33333333-3333-3333-3333-333333333333',
                      name: 'Docking Station',
                      category: 'hardware',
                      basePrice: 180,
                      unitCost: 90,
                    })
                  }
                  className="p-3.5 rounded-lg border border-[#222] bg-[#0f0f0f] hover:border-gray-500 transition cursor-pointer"
                >
                  <div className="text-xs font-medium text-white">+ Docking Station</div>
                  <div className="text-[11px] text-gray-400 mt-1">Margin +28% • $180</div>
                </div>
                <div
                  onClick={() =>
                    addProductToQuote({
                      id: '44444444-4444-4444-4444-444444444444',
                      name: 'Care Plan 2yr',
                      category: 'subscription',
                      basePrice: 45,
                      unitCost: 10,
                    })
                  }
                  className="p-3.5 rounded-lg border border-[#222] bg-[#0f0f0f] hover:border-gray-500 transition cursor-pointer"
                >
                  <div className="text-xs font-medium text-white">+ Care Plan 2yr</div>
                  <div className="text-[11px] text-gray-400 mt-1">Margin +35% • $45/mo</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Pair */}
        <div className="flex items-center gap-3 pt-4 border-t border-[#222]">
          <button
            onClick={handleCreateQuote}
            disabled={saving || lines.length === 0}
            className="px-4 py-2 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Submit for Approval'}
          </button>
          <button
            onClick={handleCreateQuote}
            disabled={saving || lines.length === 0}
            className="px-4 py-2 rounded text-xs font-medium border border-[#333] text-gray-300 hover:bg-[#1a1a1a] transition"
          >
            Save Draft
          </button>
        </div>
      </main>
    </div>
  );
}
