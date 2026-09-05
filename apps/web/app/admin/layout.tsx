'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  Layers,
  FileSpreadsheet,
  ShieldCheck,
  Activity,
  Server,
  Database,
  ExternalLink,
  Building2,
} from 'lucide-react';
import { AccountSwitcher } from '../../components/account-switcher';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>('admin');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role) {
          setUserRole(parsed.role);
          if (parsed.role === 'customer') {
            window.location.href = '/customer/orders';
          }
        }
      }
    } catch {}
  }, []);

  const allNav = [
    { name: 'Products Catalog', href: '/admin/products', icon: Package, roles: ['admin', 'sales_rep', 'sales_manager', 'finance'] },
    { name: 'Customer Tiers', href: '/admin/tiers', icon: Layers, roles: ['admin', 'sales_manager', 'finance'] },
    { name: 'Price Lists', href: '/admin/price-lists', icon: FileSpreadsheet, roles: ['admin', 'finance'] },
    { name: 'Governance Approvals', href: '/approvals', icon: ShieldCheck, roles: ['admin', 'sales_manager', 'finance', 'sales_rep'] },
  ];

  const navigation = allNav.filter((item) => item.roles.includes(userRole));

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/70 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              DF
            </div>
            <div>
              <h1 className="font-semibold text-base leading-none text-white">DealFlow360</h1>
              <p className="text-xs text-slate-400 mt-1">Master Data Admin</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
              Master Data Management
            </div>
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Infrastructure health block */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              <span>PostgreSQL 16</span>
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active :5433
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Server className="h-3.5 w-3.5 text-blue-400" />
              <span>Kong Gateway</span>
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              :8000
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Activity className="h-3.5 w-3.5 text-purple-400" />
              <span>Redis 7.2</span>
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Healthy
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-sm text-slate-400">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-100 font-medium capitalize">
              {pathname.split('/').pop()?.replace('-', ' ')}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <AccountSwitcher />
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
