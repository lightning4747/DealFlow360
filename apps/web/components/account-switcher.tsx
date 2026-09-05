'use client';

import React, { useState, useEffect } from 'react';
import { User, LogOut, ChevronDown, Check, Shield, Briefcase, DollarSign, UserCheck, Building2 } from 'lucide-react';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const PRESET_ACCOUNTS = [
  {
    email: 'admin@dealflow360.com',
    name: 'System Administrator',
    role: 'admin',
    label: 'Admin (All Access)',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    icon: Shield,
  },
  {
    email: 'manager@dealflow360.com',
    name: 'Carol Manager',
    role: 'sales_manager',
    label: 'Sales Manager (L1/L2 Approvals)',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    icon: UserCheck,
  },
  {
    email: 'finance@dealflow360.com',
    name: 'Dave Finance',
    role: 'finance',
    label: 'Finance Approver (L2/L3 Approvals)',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    icon: DollarSign,
  },
  {
    email: 'rep1@dealflow360.com',
    name: 'Alice Rep',
    role: 'sales_rep',
    label: 'Sales Representative (Quote Creator)',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    icon: Briefcase,
  },
  {
    email: 'procurement@acme.com',
    name: 'Acme Global Industries (Gold Enterprise)',
    role: 'customer',
    label: 'Customer Account (Buyer / Orders)',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    icon: Building2,
  },
];

export function AccountSwitcher() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  // Load active user from storage or initialize default
  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      } else {
        const defaultUser = {
          id: 'admin-id',
          name: 'System Administrator',
          email: 'admin@dealflow360.com',
          role: 'admin',
        };
        setCurrentUser(defaultUser);
        localStorage.setItem('currentUser', JSON.stringify(defaultUser));
      }
    } catch {
      // fallback
    }
  }, []);

  const handleSwitchAccount = async (targetAccount: typeof PRESET_ACCOUNTS[0]) => {
    try {
      setSwitching(true);
      const res = await fetch(`${apiUrl}/internal/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetAccount.email,
          password: 'password123',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const token = json.data?.tokens?.accessToken;
        const user = json.data?.user || {
          id: targetAccount.email,
          name: targetAccount.name,
          email: targetAccount.email,
          role: targetAccount.role,
        };

        if (token) {
          localStorage.setItem('token', token);
        }
        localStorage.setItem('currentUser', JSON.stringify(user));
        setCurrentUser(user);
      } else {
        // Dev fallback if direct login mock
        const fallbackUser = {
          id: targetAccount.email,
          name: targetAccount.name,
          email: targetAccount.email,
          role: targetAccount.role,
        };
        localStorage.setItem('currentUser', JSON.stringify(fallbackUser));
        setCurrentUser(fallbackUser);
      }

      setIsOpen(false);
      // Reload page to reflect new permissions and active role across view
      window.location.reload();
    } catch (err) {
      console.error('Account switch error:', err);
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      // Set to unauthenticated / prompt default
      const defaultUser = {
        id: 'guest',
        name: 'Logged Out',
        email: 'guest@dealflow360.com',
        role: 'guest',
      };
      localStorage.setItem('currentUser', JSON.stringify(defaultUser));
      setCurrentUser(defaultUser);
      setIsOpen(false);
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const activePreset = PRESET_ACCOUNTS.find((a) => a.email === currentUser?.email) || {
    email: currentUser?.email || 'admin@dealflow360.com',
    name: currentUser?.name || 'Administrator',
    role: currentUser?.role || 'admin',
    label: currentUser?.role || 'admin',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    icon: Shield,
  };

  const ActiveIcon = activePreset.icon;

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors shadow-sm"
      >
        <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
          <ActiveIcon className="h-4 w-4 text-blue-400" />
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1.5">
            <span>{currentUser?.name || 'Admin'}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded border font-mono uppercase ${activePreset.badgeColor}`}
            >
              {currentUser?.role || 'admin'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 leading-tight truncate max-w-[140px]">
            {currentUser?.email || 'admin@dealflow360.com'}
          </div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
          <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Switch Demo Persona</p>
            <p className="text-xs text-slate-500 mt-0.5">Switch role to test quote approvals & role limits</p>
          </div>

          <div className="p-1.5 space-y-1">
            {PRESET_ACCOUNTS.map((account) => {
              const Icon = account.icon;
              const isSelected = currentUser?.email === account.email;

              return (
                <button
                  key={account.email}
                  disabled={switching}
                  onClick={() => handleSwitchAccount(account)}
                  className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-600/15 border border-blue-500/30 text-white font-medium'
                      : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="h-7 w-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <span>{account.name}</span>
                        <span className={`text-[9px] px-1 py-0.2 rounded border font-mono uppercase ${account.badgeColor}`}>
                          {account.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{account.email}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-blue-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* Logout button */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-950/40">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out & Reset Session</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
