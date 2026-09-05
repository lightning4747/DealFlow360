'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw, ShoppingBag, Shield } from 'lucide-react';
import { AccountSwitcher } from '../../components/account-switcher';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: 'hardware' | 'services' | 'subscription';
  basePrice: number;
  unitCost: number;
  unit: string;
  taxRate: number;
  description?: string;
  isActive: boolean;
}

export default function CatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('sales_rep');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role) {
          setUserRole(parsed.role);
          if (parsed.role === 'customer') {
            router.push('/customer/orders');
          }
        }
      }
    } catch {}
  }, [router]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (search) params.append('search', search);
      params.append('limit', '50');

      const res = await fetch(`${apiUrl}/sales/products?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch products: ${res.statusText}`);
      const json = await res.json();
      setProducts(json.data || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 md:px-10 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base leading-none text-white">Commercial Product Catalog</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                Sales Portal
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Enterprise SKU Directory & List Pricing Schedule</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {(userRole === 'admin' || userRole === 'sales_manager' || userRole === 'finance') && (
            <Link
              href="/approvals"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition"
            >
              <Shield className="h-3.5 w-3.5 text-indigo-400" />
              <span>Approvals Queue</span>
            </Link>
          )}
          {userRole === 'admin' && (
            <Link
              href="/admin/products"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition"
            >
              <span>Admin Center</span>
            </Link>
          )}
          <AccountSwitcher />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10 space-y-6">
        {/* Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Sales Representative Catalog</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Browse current available commercial SKUs, categories, and approved list pricing to configure customer quotations.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU or product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </form>

          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
            {['all', 'hardware', 'subscription', 'services'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={() => fetchProducts()}
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 ml-2"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">SKU & Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Base List Price</th>
                <th className="py-3 px-4 text-center">Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-500 mb-2" />
                    Loading catalog items...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{product.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{product.sku}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                          product.category === 'hardware'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : product.category === 'subscription'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        }`}
                      >
                        {product.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-white">
                      ${product.basePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {product.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
