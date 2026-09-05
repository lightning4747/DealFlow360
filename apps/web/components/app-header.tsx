'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_TABS = [
  { name: 'Dashboard', href: '/' },
  { name: 'Quotations', href: '/quotations' },
  { name: 'Approvals', href: '/approvals' },
  { name: 'Fulfillment', href: '/fulfillment' },
  { name: 'Subscriptions', href: '/subscriptions' },
  { name: 'Invoices', href: '/invoices' },
  { name: 'Deal Health', href: '/deal-health' },
  { name: 'Reports', href: '/reports' },
  { name: 'Products', href: '/products' },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="h-14 border-b border-[#222] bg-[#0c0c0c] px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-6 overflow-x-auto py-2">
        <Link href="/" className="text-sm font-semibold tracking-tight text-white hover:text-gray-300 mr-2 shrink-0">
          DealFlow360
        </Link>
        <nav className="flex items-center space-x-1 shrink-0">
          {NAV_TABS.map((tab) => {
            const isActive =
              tab.href === '/'
                ? pathname === '/'
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-black font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center space-x-3 shrink-0 ml-4">
        <div className="text-xs text-gray-400 border border-[#222] px-2.5 py-1 rounded bg-[#111]">
          Sales Workspace
        </div>
      </div>
    </header>
  );
}
