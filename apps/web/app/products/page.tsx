'use client';

import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { API_BASE_URL, getAuthHeaders } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  basePrice: number;
  unit: string;
  taxRate: number;
  isActive: boolean;
}

interface PriceList {
  id: string;
  name: string;
  effectiveDate: string;
}

export default function ProductsPage() {
  const { isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    const loadCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = getAuthHeaders();
        const [productsResponse, priceListsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/sales/products?limit=100`, { headers }),
          fetch(`${API_BASE_URL}/sales/price-lists`, { headers }),
        ]);

        if (!productsResponse.ok || !priceListsResponse.ok) {
          throw new Error(
            `Catalog request failed (products: HTTP ${productsResponse.status}, price lists: HTTP ${priceListsResponse.status})`,
          );
        }

        const [productsPayload, priceListsPayload] = await Promise.all([
          productsResponse.json(),
          priceListsResponse.json(),
        ]);

        setProducts(productsPayload.data || []);
        setPriceLists(priceListsPayload.data || []);
      } catch (loadError: any) {
        setProducts([]);
        setPriceLists([]);
        setError(loadError.message || 'Unable to load catalog data');
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, [authLoading]);

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 p-8">
        <header>
          <h1 className="text-xl font-bold tracking-tight">Product Catalog</h1>
          <p className="mt-1 text-xs text-gray-400">Products and pricing configured in the backend.</p>
        </header>

        {loading && <p className="text-xs text-gray-400">Loading catalog...</p>}
        {error && (
          <div className="rounded border border-rose-900 bg-rose-950/30 p-4 text-xs text-rose-300">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Products ({products.length})
              </h2>
              {products.length === 0 ? (
                <p className="rounded border border-[#222] bg-[#0e0e0e] p-8 text-center text-xs text-gray-500">
                  The backend returned no products.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-[#222] bg-[#0d0d0d]">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-[#141414] text-[11px] uppercase tracking-wider text-gray-400">
                      <tr>
                        <th className="border-b border-[#222] px-4 py-3">Name</th>
                        <th className="border-b border-[#222] px-4 py-3">SKU</th>
                        <th className="border-b border-[#222] px-4 py-3">Category</th>
                        <th className="border-b border-[#222] px-4 py-3">Base price</th>
                        <th className="border-b border-[#222] px-4 py-3">Unit</th>
                        <th className="border-b border-[#222] px-4 py-3">Tax rate</th>
                        <th className="border-b border-[#222] px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e1e1e]">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-[#181818]">
                          <td className="px-4 py-3 font-medium">{product.name}</td>
                          <td className="px-4 py-3 font-mono text-gray-400">{product.sku}</td>
                          <td className="px-4 py-3 text-gray-400">{product.category}</td>
                          <td className="px-4 py-3 font-mono">
                            {product.basePrice.toLocaleString(undefined, {
                              style: 'currency',
                              currency: 'USD',
                            })}
                          </td>
                          <td className="px-4 py-3 text-gray-400">{product.unit}</td>
                          <td className="px-4 py-3 text-gray-400">{product.taxRate}%</td>
                          <td className="px-4 py-3 text-gray-300">{product.isActive ? 'Active' : 'Inactive'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Price lists ({priceLists.length})
              </h2>
              {priceLists.length === 0 ? (
                <p className="rounded border border-[#222] bg-[#0e0e0e] p-6 text-xs text-gray-500">
                  The backend returned no price lists.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {priceLists.map((priceList) => (
                    <article key={priceList.id} className="rounded-lg border border-[#222] bg-[#0e0e0e] p-4">
                      <h3 className="text-sm font-medium">{priceList.name}</h3>
                      <p className="mt-1 text-xs text-gray-400">
                        Effective {new Date(priceList.effectiveDate).toLocaleDateString()}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
