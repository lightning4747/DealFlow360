'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

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
  const { user, logout } = useAuth();

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
        {user ? (
          <div className="flex items-center space-x-2.5">
            <div className="text-right">
              <div className="text-xs font-medium text-white">{user.name}</div>
              <div className="text-[10px] text-gray-400 capitalize font-mono">{user.role.replace('_', ' ')}</div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="text-xs text-gray-400 hover:text-white border border-[#333] px-2.5 py-1 rounded bg-[#111] hover:bg-[#1f1f1f] transition"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="px-3 py-1.5 rounded text-xs font-semibold bg-white text-black hover:bg-gray-200 transition"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
