'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileSpreadsheet,
  ShieldCheck,
  Truck,
  Repeat,
  Receipt,
  HeartHandshake,
  Package,
  Layers,
  PanelLeftClose,
  PanelLeft,
  Search,
} from 'lucide-react';
import { AccountSwitcher } from '../account-switcher';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
}

const PRIMARY_NAVIGATION: NavItem[] = [
  { name: 'Approvals', href: '/approvals', icon: ShieldCheck },
  { name: 'Commercial Catalog', href: '/catalog', icon: Package },
  { name: 'Products Master', href: '/admin/products', icon: Layers },
  { name: 'Customer Tiers', href: '/admin/tiers', icon: Layers },
  { name: 'Price Lists', href: '/admin/price-lists', icon: FileSpreadsheet },
];

export function AppShell({
  children,
  headerAction,
  pageTitle,
}: {
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  pageTitle?: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('df_sidebar_collapsed');
      if (stored !== null) {
        setCollapsed(stored === 'true');
      }
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('df_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const currentSegment = pathname.split('/')[1] || 'dashboard';

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-flow/30 selection:text-white">
      {/* Persistent Left Rail Navigation */}
      <aside
        className={cn(
          'border-r border-border/80 bg-slate-950/70 backdrop-blur-xl flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out z-30 sticky top-0 h-screen',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        <div>
          {/* Rail Header & Brand */}
          <div className="h-16 border-b border-border/80 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 rounded-xl bg-flow flex items-center justify-center font-bold text-white shadow-lg shadow-flow/25 shrink-0 border border-flow/40">
                DF
              </div>
              {!collapsed && (
                <div className="whitespace-nowrap transition-opacity duration-200">
                  <h1 className="font-semibold text-sm tracking-tight text-white leading-none">
                    DealFlow360
                  </h1>
                  <span className="text-[11px] text-muted-foreground">
                    Enterprise Workspace
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-white/[0.06] transition"
              title={collapsed ? 'Expand Rail' : 'Collapse Rail'}
            >
              {collapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            {!collapsed && (
              <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-3 mb-2">
                Workspaces
              </p>
            )}
            {PRIMARY_NAVIGATION.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={cn(
                    'flex items-center rounded-xl text-xs font-medium transition-all group relative',
                    collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
                    isActive
                      ? 'bg-flow text-white shadow-md shadow-flow/20 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent hover:border-white/[0.05]'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform group-hover:scale-105',
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Rail Footer */}
        <div className="p-4 border-t border-border/80 bg-slate-950/40">
          {!collapsed ? (
            <div className="text-xs text-muted-foreground">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Operational v1.0</span>
              </div>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                Minimal Neutral System
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-border/80 bg-slate-950/50 backdrop-blur-xl px-6 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="hover:text-foreground transition cursor-default capitalize">
                {currentSegment.replace('-', ' ')}
              </span>
              {pageTitle && (
                <>
                  <span>/</span>
                  <span className="text-foreground font-semibold">
                    {pageTitle}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {headerAction}
            <AccountSwitcher />
          </div>
        </header>

        {/* Body Workspace */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
