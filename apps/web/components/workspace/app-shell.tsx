'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AccountSwitcher } from '../account-switcher';

export interface NavTab {
  name: string;
  href: string;
  screenNum?: number;
}

const TABS: NavTab[] = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Quotations', href: '/quotations' },
  { name: 'Approvals', href: '/approvals' },
  { name: 'Fulfillment', href: '/fulfillment' },
  { name: 'Subscriptions', href: '/subscriptions' },
  { name: 'Invoices', href: '/invoices' },
  { name: 'Deal Health', href: '/deal-health' },
  { name: 'Reports', href: '/reports' },
  { name: 'Products', href: '/admin/products' },
];

export function AppShell({
  children,
  headerTitle,
  headerSubtitle,
  actions,
}: {
  children: React.ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Black Navigation Bar strictly matching Excalidraw / PNG */}
      <header className="h-14 border-b border-border bg-card/95 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center space-x-6 overflow-x-auto py-2 scrollbar-none">
          {/* Logo / Wordmark */}
          <Link
            href="/dashboard"
            className="text-sm font-semibold tracking-tight text-white hover:text-neutral-300 transition shrink-0 mr-2"
          >
            DealFlow360
          </Link>

          {/* Pill Tabs: White highlighted active tab, subtle transparent inactive tabs */}
          <nav className="flex items-center space-x-1 shrink-0">
            {TABS.map((tab) => {
              const isActive =
                pathname === tab.href ||
                (tab.href !== '/dashboard' && pathname.startsWith(tab.href)) ||
                (tab.name === 'Products' && pathname.startsWith('/admin'));

              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-white text-black shadow-sm font-semibold'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                  )}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right header controls */}
        <div className="flex items-center space-x-3 shrink-0 ml-4">
          <AccountSwitcher />
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {(headerTitle || actions) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
            <div>
              {headerTitle && (
                <h1 className="text-xl font-bold tracking-tight text-white">
                  {headerTitle}
                </h1>
              )}
              {headerSubtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {headerSubtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2.5">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
