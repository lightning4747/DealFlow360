'use client';

import React, { useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { API_BASE_URL, getAuthHeaders } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
}

interface StockRow {
  id: string;
  warehouse_name: string;
  warehouse_code: string;
  product_name: string;
  sku: string;
  available_qty: number;
  reserved_qty: number;
}

export default function FulfillmentPage() {
  const { isLoading: authLoading } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const headers = getAuthHeaders();
        const [warehouseRes, stockRes] = await Promise.all([
          fetch(`${API_BASE_URL}/fulfillment/warehouses`, { headers }),
          fetch(`${API_BASE_URL}/fulfillment/stock`, { headers }),
        ]);
        if (!warehouseRes.ok || !stockRes.ok) {
          throw new Error(`Unable to load fulfillment data (HTTP ${warehouseRes.status}/${stockRes.status})`);
        }
        const [warehouseJson, stockJson] = await Promise.all([warehouseRes.json(), stockRes.json()]);
        setWarehouses(warehouseJson.data || []);
        setStock(stockJson.data || []);
      } catch (err: any) {
        setError(err.message || 'Unable to load fulfillment data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authLoading]);

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Fulfillment and Stock</h1>
          <p className="text-xs text-gray-400 mt-1">Live inventory from active warehouses.</p>
        </div>
        {loading && <div className="text-xs text-gray-400">Loading fulfillment data...</div>}
        {error && <div className="p-4 border border-rose-900 bg-rose-950/30 rounded text-xs text-rose-300">{error}</div>}
        {!loading && !error && (
          <>
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Warehouses ({warehouses.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {warehouses.map((warehouse) => (
                  <div key={warehouse.id} className="border border-[#222] rounded-lg bg-[#0e0e0e] p-4">
                    <div className="text-sm font-medium">{warehouse.name}</div>
                    <div className="text-xs text-gray-500 font-mono mt-1">{warehouse.code}</div>
                    {warehouse.address && <div className="text-xs text-gray-400 mt-2">{warehouse.address}</div>}
                  </div>
                ))}
              </div>
            </section>
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Current Stock ({stock.length})</h2>
              <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Warehouse</th>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">In Stock</th>
                      <th className="py-3 px-4">Reserved</th>
                      <th className="py-3 px-4">Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e1e]">
                    {stock.map((row) => (
                      <tr key={row.id} className="hover:bg-[#181818]">
                        <td className="py-3 px-4 text-white">{row.warehouse_name}</td>
                        <td className="py-3 px-4 text-gray-300">{row.product_name}<span className="block text-[10px] text-gray-500">{row.sku}</span></td>
                        <td className="py-3 px-4 font-mono">{row.available_qty + row.reserved_qty}</td>
                        <td className="py-3 px-4 font-mono">{row.reserved_qty}</td>
                        <td className="py-3 px-4 font-mono text-emerald-400">{row.available_qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {stock.length === 0 && <div className="p-8 text-center text-xs text-gray-500">No stock records found.</div>}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
