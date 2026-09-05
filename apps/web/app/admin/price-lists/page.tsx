'use client';

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Plus, Calendar, Tag, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';

interface PriceList {
  id: string;
  name: string;
  tierId?: string;
  effectiveDate: string;
  createdAt: string;
  items?: Array<{
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    price: number;
  }>;
}

export default function PriceListsPage() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [selectedList, setSelectedList] = useState<PriceList | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

  const fetchPriceLists = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/sales/price-lists`);
      if (!res.ok) throw new Error('Failed to fetch price lists');
      const json = await res.json();
      const lists = json.data || [];
      setPriceLists(lists);

      if (lists.length > 0 && !selectedList) {
        fetchListDetails(lists[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchListDetails = async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/sales/price-lists/${id}`);
      if (!res.ok) throw new Error('Failed to fetch price list details');
      const json = await res.json();
      setSelectedList(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPriceLists();
  }, []);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      setCreating(true);
      const res = await fetch(`${apiUrl}/sales/price-lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newListName,
          effectiveDate: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error('Failed to create price list');
      const json = await res.json();
      setIsCreateModalOpen(false);
      setNewListName('');
      await fetchPriceLists();
      if (json.data?.id) fetchListDetails(json.data.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Price Lists & Overrides</h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure partner tier price books, contracted custom SKUs, and volume discount schedules.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-lg shadow-blue-600/20"
        >
          <Plus className="h-4 w-4" />
          <span>New Price List</span>
        </button>
      </div>

      {/* Main Grid: list selector + item overrides table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Price Lists sidebar */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
            Active Price Books
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Loading price lists...</div>
          ) : priceLists.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No price lists created yet.</div>
          ) : (
            <div className="space-y-2">
              {priceLists.map((pl) => {
                const isSelected = selectedList?.id === pl.id;
                return (
                  <button
                    key={pl.id}
                    onClick={() => fetchListDetails(pl.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500/40 text-white shadow-md'
                        : 'bg-slate-950/50 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="font-semibold text-sm">{pl.name}</div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1.5 font-mono">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(pl.effectiveDate).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Price List overrides */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          {selectedList ? (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedList.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ID: <span className="font-mono">{selectedList.id}</span>
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active Book
                </span>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Contracted SKU Overrides ({selectedList.items?.length || 0})
                </h4>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 px-4">SKU</th>
                        <th className="py-2.5 px-4">Product Name</th>
                        <th className="py-2.5 px-4 text-right">Negotiated Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {!selectedList.items || selectedList.items.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-400 text-xs">
                            No SKU price overrides registered in this price book.
                          </td>
                        </tr>
                      ) : (
                        selectedList.items.map((it) => (
                          <tr key={it.id} className="hover:bg-slate-800/30">
                            <td className="py-3 px-4 font-mono text-xs text-blue-400">
                              {it.productSku || it.productId.slice(0, 8)}
                            </td>
                            <td className="py-3 px-4 font-medium text-white">
                              {it.productName || 'Catalog Product'}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                              ${it.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-400 text-sm">
              Select a price list from the sidebar to inspect SKU overrides.
            </div>
          )}
        </div>
      </div>

      {/* New Price List Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Create Price List</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateList} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Price List Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Strategic Enterprise Book"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
