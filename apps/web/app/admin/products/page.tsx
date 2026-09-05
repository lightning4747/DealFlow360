'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('admin');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role) setUserRole(parsed.role);
      }
    } catch {}
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'hardware',
    basePrice: '',
    unitCost: '',
    unit: 'each',
    description: '',
  });

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

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      setSubmitting(true);
      const res = await fetch(`${apiUrl}/sales/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: formData.sku,
          name: formData.name,
          category: formData.category,
          basePrice: parseFloat(formData.basePrice),
          unitCost: parseFloat(formData.unitCost || '0'),
          unit: formData.unit,
          description: formData.description,
          isActive: true,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson?.error?.message || 'Failed to create product');
      }

      setIsModalOpen(false);
      setFormData({
        sku: '',
        name: '',
        category: 'hardware',
        basePrice: '',
        unitCost: '',
        unit: 'each',
        description: '',
      });
      fetchProducts();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      if (product.isActive) {
        await fetch(`${apiUrl}/sales/products/${product.id}`, { method: 'DELETE' });
      } else {
        await fetch(`${apiUrl}/sales/products/${product.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true }),
        });
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isActive: !p.isActive } : p)),
      );
    } catch (err: any) {
      alert('Status update failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Product Catalog</h2>
          <p className="text-sm text-slate-400 mt-1">
            {userRole === 'admin'
              ? 'Manage enterprise SKUs, categories, base pricing, and unit margins.'
              : 'Browse enterprise product catalog, active categories, and contracted list pricing.'}
          </p>
        </div>
        {userRole === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add SKU</span>
          </button>
        )}
      </div>

      {/* Control bar: search + filters */}
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

      {/* Table display */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4">SKU & Product Name</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-right">Base Price</th>
              {userRole === 'admin' && <th className="py-3 px-4 text-right">Unit Cost</th>}
              {userRole === 'admin' && <th className="py-3 px-4 text-right">Unit Margin</th>}
              <th className="py-3 px-4 text-center">Status</th>
              {userRole === 'admin' && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-500 mb-2" />
                  Loading products catalog...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No products found matching filters.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const margin = product.basePrice - product.unitCost;
                const marginPct =
                  product.basePrice > 0 ? ((margin / product.basePrice) * 100).toFixed(1) : '0';

                return (
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
                    {userRole === 'admin' && (
                      <td className="py-3.5 px-4 text-right text-slate-400">
                        ${product.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    )}
                    {userRole === 'admin' && (
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-emerald-400 font-medium">${margin.toFixed(2)}</span>
                        <span className="text-xs text-slate-500 ml-1">({marginPct}%)</span>
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        disabled={userRole !== 'admin'}
                        onClick={() => toggleProductStatus(product)}
                        className={`inline-flex items-center space-x-1 ${userRole === 'admin' ? 'transition-opacity hover:opacity-80' : 'cursor-default'}`}
                      >
                        {product.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                            Deactivated
                          </span>
                        )}
                      </button>
                    </td>
                    {userRole === 'admin' && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => toggleProductStatus(product)}
                          className="text-xs text-slate-400 hover:text-white underline"
                        >
                          {product.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Product Creation Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Add New Catalog Product</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HW-SRV-003"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="hardware">Hardware</option>
                    <option value="subscription">Subscription</option>
                    <option value="services">Services</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High-Density Storage Node"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Base Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="2500.00"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="1500.00"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="each / mo"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Commercial description and specifications..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create SKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
