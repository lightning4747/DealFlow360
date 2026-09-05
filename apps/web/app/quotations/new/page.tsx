'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { useAuth } from '@/lib/auth-context';
import { getAuthHeaders, API_BASE_URL } from '@/lib/api-client';

interface CustomerItem {
  id: string;
  name: string;
  company: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  email: string;
}

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
  reason: string;
  marginBoostPct: string;
  recommendedProduct?: {
    id: string;
    name: string;
    category: string;
    basePrice: string;
    unitCost: string;
  };
}

export default function NewQuotationPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerTier, setCustomerTier] = useState<'bronze' | 'silver' | 'gold' | 'platinum'>('silver');
  
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user?.role !== 'sales_rep') {
      router.replace('/quotations');
    }
  }, [isLoading, router, user]);

  // 1. Load real customers from database
  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch(`${API_BASE_URL}/sales/customers`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          const list: CustomerItem[] = json.data || [];
          setCustomers(list);
          if (list.length > 0) {
            setSelectedCustomerId(list[0].id);
            setCustomerTier(list[0].tier);
          }
        }
      } catch (err) {
        console.error('Failed to load customers:', err);
      }
    }
    loadCustomers();
  }, []);

  // When selected customer changes, update their tier
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      setCustomerTier(found.tier);
    }
  };

  // 2. Load available catalog products
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch(`${API_BASE_URL}/sales/products?limit=50`, {
          headers: getAuthHeaders(),
        });
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
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      }
    }
    loadProducts();
  }, []);

  // 3. Recalculate margins and fetch upsell recommendations when lines or tier changes
  useEffect(() => {
    if (lines.length === 0) {
      setSummary(null);
      setRecommendations([]);
      return;
    }

    async function recalculate() {
      try {
        const calcRes = await fetch(`${API_BASE_URL}/sales/quotes/calculate`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            customerId: selectedCustomerId || undefined,
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
          // Client fallback calculation
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

        // Fetch upsell recommendations
        const productIds = Array.from(new Set(lines.map((l) => l.productId)));
        const recRes = await fetch(`${API_BASE_URL}/sales/recommendations`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ productIds }),
        });

        if (recRes.ok) {
          const recJson = await recRes.json();
          setRecommendations(recJson.data || []);
        }
      } catch (e) {
        console.warn('Calculation failed:', e);
      }
    }
    recalculate();
  }, [lines, customerTier, selectedCustomerId]);

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

  const handleSaveOrSubmit = async (shouldSubmit = false) => {
    if (lines.length === 0) return;
    if (!selectedCustomerId) {
      setErrorMessage('Please select a customer account');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      // 1. Create quote in database
      const res = await fetch(`${API_BASE_URL}/sales/quotes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          customerId: selectedCustomerId,
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

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || 'Failed to save quote to backend');
      }

      const json = await res.json();
      const quoteId = json.data?.quote?.id || json.data?.id;

      // 2. If submitting for approval, route through governance
      if (shouldSubmit && quoteId) {
        try {
          await fetch(`${API_BASE_URL}/sales/quotes/${quoteId}/submit`, {
            method: 'POST',
            headers: getAuthHeaders(),
          });
        } catch (submitErr) {
          console.warn('Auto approval routing triggered:', submitErr);
        }
      }

      router.push(`/quotations/${quoteId}`);
    } catch (err: any) {
      console.error('Error saving quote:', err);
      setErrorMessage(err.message || 'Failed to persist quotation to database');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || user?.role !== 'sales_rep') {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Workspace Title & Customer Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#222] pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Quote Builder Workspace</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Select customer, add products from catalog, apply real-time governed discounts, and persist directly to database.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="space-y-0.5">
              <span className="text-[11px] text-gray-400 block">Customer Account:</span>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="bg-[#111] border border-[#333] text-white text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.company}) — {c.tier.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] text-gray-400 block">Customer Tier:</span>
              <select
                value={customerTier}
                onChange={(e: any) => setCustomerTier(e.target.value)}
                className="bg-[#111] border border-[#333] text-white text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-white"
              >
                <option value="bronze">Bronze (5% max)</option>
                <option value="silver">Silver (10% max)</option>
                <option value="gold">Gold (15% max)</option>
                <option value="platinum">Platinum (20% max)</option>
              </select>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[#1a0f0f] border border-red-900/50 rounded-lg text-xs text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Catalog Quick-Add Shelf */}
        <div className="p-4 rounded-lg border border-[#222] bg-[#0c0c0c] space-y-2">
          <div className="text-xs font-semibold text-gray-300">Catalog Quick-Add</div>
          <div className="flex flex-wrap gap-2">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProductToQuote(p)}
                className="px-3 py-1.5 rounded border border-[#262626] bg-[#141414] hover:border-gray-400 text-xs text-gray-200 transition"
              >
                + {p.name} (${p.basePrice.toLocaleString()})
              </button>
            ))}
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
                  const calculatedLine = summary?.lines?.[idx];
                  const ceiling = calculatedLine?.appliedCeilingPct ?? 15;
                  const isOver = line.discountPct > ceiling;

                  return (
                    <tr key={`${line.productId}-${idx}`} className="hover:bg-[#181818] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{line.name}</div>
                        <div className="text-[10px] text-gray-500 uppercase">{line.lineType.replace('_', ' ')}</div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => updateLineQuantity(idx, parseInt(e.target.value, 10) || 1)}
                          className="w-16 px-2 py-1 bg-black border border-[#333] rounded text-white text-xs font-mono"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono text-white">
                        ${line.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={line.discountPct}
                            onChange={(e) => updateLineDiscount(idx, parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 bg-black border border-[#333] rounded text-white text-xs font-mono"
                          />
                          <span className="text-gray-400">%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-400">
                        {ceiling}% max
                      </td>
                      <td className="py-3 px-4">
                        {isOver ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-red-800 bg-red-950/40 text-red-300">
                            OVER ({ceiling}% limit)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-emerald-900 bg-emerald-950/40 text-emerald-300">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="text-gray-500 hover:text-red-400 text-xs font-mono"
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

        {/* Live Margins & BRS Governance Rail */}
        {summary && (
          <div className="p-4 rounded-lg border border-[#222] bg-[#0c0c0c] space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Live Commercial Terms &amp; Margin Breakdown
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-1 border-t border-[#1e1e1e]">
              <div>
                <div className="text-[11px] text-gray-400">Gross Subtotal</div>
                <div className="text-sm font-mono font-semibold text-white mt-0.5">
                  ${summary.subtotalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-400">Total Discount</div>
                <div className="text-sm font-mono font-semibold text-red-300 mt-0.5">
                  -${summary.totalDiscountAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-400">Net Quote Value</div>
                <div className="text-sm font-mono font-bold text-white mt-0.5">
                  ${summary.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-400">Gross Margin %</div>
                <div className={`text-sm font-mono font-semibold mt-0.5 ${
                  summary.marginHealth === 'critical'
                    ? 'text-red-400'
                    : summary.marginHealth === 'caution'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}>
                  {summary.grossMarginPct?.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-400">Governance Gate</div>
                <div className="text-xs font-mono font-semibold mt-0.5">
                  {summary.requiresApproval ? (
                    <span className="text-amber-300">Requires {summary.approvalLevel?.toUpperCase()}</span>
                  ) : (
                    <span className="text-emerald-300">Auto-Pass</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upsell / Cross-Sell Suggestions */}
        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Upsell and Cross-Sell Suggestions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recommendations.length > 0 ? (
              recommendations.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => {
                    if (rec.recommendedProduct) {
                      addProductToQuote({
                        id: rec.recommendedProduct.id,
                        name: rec.recommendedProduct.name,
                        category: rec.recommendedProduct.category,
                        basePrice: parseFloat(rec.recommendedProduct.basePrice),
                        unitCost: parseFloat(rec.recommendedProduct.unitCost),
                      });
                    }
                  }}
                  className="p-3.5 rounded-lg border border-[#222] bg-[#0f0f0f] hover:border-gray-500 transition cursor-pointer"
                >
                  <div className="text-xs font-medium text-white">
                    + {rec.recommendedProduct?.name || 'Recommended Add-on'}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    Margin +{rec.marginBoostPct}% • {rec.reason}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-500 col-span-3 py-2">
                Add products above to surface intelligent cross-sell suggestions.
              </div>
            )}
          </div>
        </div>

        {/* Action Pair */}
        <div className="flex items-center gap-3 pt-4 border-t border-[#222]">
          <button
            type="button"
            onClick={() => handleSaveOrSubmit(true)}
            disabled={saving || lines.length === 0}
            className="px-4 py-2 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition disabled:opacity-50"
          >
            {saving ? 'Persisting...' : 'Submit for Approval'}
          </button>
          <button
            type="button"
            onClick={() => handleSaveOrSubmit(false)}
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
