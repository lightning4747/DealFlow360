'use client';

import React from 'react';
import { AppHeader } from '@/components/app-header';

export default function FulfillmentPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Fulfillment and Stock (List)</h1>
          <p className="text-xs text-gray-400 mt-1">Live stock levels across warehouses and orders that need fulfilling</p>
        </div>

        {/* Warehouse Stock Table from PNG Screen 7 */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Warehouse Stock</h2>
          <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#222] bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-medium">Warehouse</th>
                  <th className="py-3 px-4 font-medium">Product</th>
                  <th className="py-3 px-4 font-medium">In Stock</th>
                  <th className="py-3 px-4 font-medium">Reserved</th>
                  <th className="py-3 px-4 font-medium">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e1e]">
                <tr className="hover:bg-[#181818] transition-colors">
                  <td className="py-3 px-4 text-white font-medium">Main Warehouse</td>
                  <td className="py-3 px-4 text-gray-300">Laptop Pro 14</td>
                  <td className="py-3 px-4 font-mono">40</td>
                  <td className="py-3 px-4 font-mono">18</td>
                  <td className="py-3 px-4 font-mono text-white">22</td>
                </tr>
                <tr className="hover:bg-[#181818] transition-colors">
                  <td className="py-3 px-4 text-white font-medium">East Depot</td>
                  <td className="py-3 px-4 text-gray-300">Laptop Pro 14</td>
                  <td className="py-3 px-4 font-mono">10</td>
                  <td className="py-3 px-4 font-mono">6</td>
                  <td className="py-3 px-4 font-mono text-white">4</td>
                </tr>
                <tr className="hover:bg-[#181818] transition-colors">
                  <td className="py-3 px-4 text-white font-medium">Main Warehouse</td>
                  <td className="py-3 px-4 text-gray-300">Docking Station</td>
                  <td className="py-3 px-4 font-mono">65</td>
                  <td className="py-3 px-4 font-mono">12</td>
                  <td className="py-3 px-4 font-mono text-white">53</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Orders Awaiting Fulfillment */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Orders Awaiting Fulfillment</h2>
          <div className="border border-[#222] rounded-lg overflow-hidden bg-[#0e0e0e]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#222] bg-[#141414] text-gray-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-medium">Order</th>
                  <th className="py-3 px-4 font-medium">Customer</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Warehouses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e1e]">
                <tr className="hover:bg-[#181818] transition-colors cursor-pointer">
                  <td className="py-3 px-4 font-mono font-semibold text-white">Q-1042</td>
                  <td className="py-3 px-4 text-gray-300">Acme Corp</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] border border-[#333] bg-[#1a1a1a] text-gray-300">
                      Split Pending
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">Main + East Depot</td>
                </tr>
                <tr className="hover:bg-[#181818] transition-colors cursor-pointer">
                  <td className="py-3 px-4 font-mono font-semibold text-white">Q-1033</td>
                  <td className="py-3 px-4 text-gray-300">Zenith Co</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] border border-[#333] bg-[#1a1a1a] text-gray-300">
                      Backorder
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">East Depot</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
