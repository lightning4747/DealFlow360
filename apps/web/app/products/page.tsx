'use client';

import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/app-header';

interface ProductItem {
  id: string;
  name: string;
  category: string;
  variants: string;
  price: string;
  unit: string;
  tax: string;
  status: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${apiUrl}/sales/products?limit=20`);
        if (res.ok) {
          const json = await res.json();
          const list = json.data || [];
          setProducts(
            list.map((p: any) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              variants: p.sku || 'Standard',
              price: `$${parseFloat(p.basePrice || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
              unit: p.unit || 'Each',
              tax: `${p.taxRate || 0}%`,
              status: p.isActive ? 'Active' : 'Inactive',
            }))
          );
        } else {
          throw new Error('Fallback');
        }
      } catch {
        setProducts([
          { id: '1', name: 'Laptop Pro 14', category: 'Hardware', variants: 'Space Gray', price: '$1,250.00', unit: 'Each', tax: '12%', status: 'Active' },
          { id: '2', name: 'Onsite Setup Service', category: 'Services', variants: 'Standard', price: '$450.00', unit: 'Each', tax: '18%', status: 'Active' },
          { id: '3', name: 'Docking Station', category: 'Hardware', variants: 'USB-C Dual', price: '$180.00', unit: 'Each', tax: '10%', status: 'Active' },
          { id: '4', name: 'Care Plan 2yr', category: 'Subscription', variants: '24 Month SLA', price: '$45.00/month', unit: 'Recurring', tax: '0%', status: 'Active' },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [apiUrl]);

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Product Catalog</h1>
            <p className="text-xs text-gray-400 mt-1">Every product, variant, and price list in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition">
              + New Product
            </button>
            <button className="px-3 py-1.5 rounded text-xs font-medium border border-[#333] text-gray-300 hover:bg-[#1a1a1a] transition">
              Manage Price Fields
            </button>
          </div>
        </div>

        {/* 3 Metric Tiles from PNG Screen 16 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-[#222] bg-[#0f0f0f]">
            <div className="text-xs text-gray-400">Total Products</div>
            <div className="text-lg font-bold text-white mt-1">124 active, 6 archived</div>
          </div>
          <div className="p-4 rounded-lg border border-[#222] bg-[#0f0f0f]">
            <div className="text-xs text-gray-400">Price Lists</div>
            <div className="text-lg font-bold text-white mt-1">3 tiers, 2 currencies</div>
          </div>
          <div className="p-4 rounded-lg border border-[#222] bg-[#0f0f0f]">
            <div className="text-xs text-gray-400">Variants</div>
            <div className="text-lg font-bold text-white mt-1">340 SKUs across all products</div>
          </div>
        </div>

        {/* Products Table */}
        <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0d0d0d]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#222] bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-medium">Product Name</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">Variants</th>
                <th className="py-3 px-4 font-medium">Price</th>
                <th className="py-3 px-4 font-medium">Unit</th>
                <th className="py-3 px-4 font-medium">Tax</th>
                <th className="py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-[#181818] transition-colors cursor-pointer">
                  <td className="py-3 px-4 font-medium text-white">{p.name}</td>
                  <td className="py-3 px-4 text-gray-400">{p.category}</td>
                  <td className="py-3 px-4 text-gray-400">{p.variants}</td>
                  <td className="py-3 px-4 font-mono text-white">{p.price}</td>
                  <td className="py-3 px-4 text-gray-400">{p.unit}</td>
                  <td className="py-3 px-4 text-gray-400">{p.tax}</td>
                  <td className="py-3 px-4 text-gray-300">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
