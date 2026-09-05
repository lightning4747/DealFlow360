'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const DEMO_PERSONAS = [
  {
    role: 'Sales Representative',
    email: 'rep1@dealflow360.com',
    desc: 'Builds quotes, configures items, requests discounts',
  },
  {
    role: 'Sales Manager',
    email: 'manager@dealflow360.com',
    desc: 'Reviews deals, approves tier-1/tier-2 threshold discounts',
  },
  {
    role: 'Finance & Ops',
    email: 'finance@dealflow360.com',
    desc: 'Approves high-risk escalations, reviews invoice schedules',
  },
  {
    role: 'Administrator',
    email: 'admin@dealflow360.com',
    desc: 'Manages product catalog, pricing rules, customer tiers',
  },
];

const DEMO_CUSTOMER_ACCOUNTS = [
  {
    name: 'Sarah Connor',
    email: 'procurement@acme.com',
    company: 'Acme Corporation',
    tier: 'Gold',
    defaultQuoteId: 'Q-1042',
  },
  {
    name: 'Hank Scorpio',
    email: 'purchasing@globex.com',
    company: 'Globex Corporation',
    tier: 'Gold',
    defaultQuoteId: 'Q-1043',
  },
  {
    name: 'Peter Gibbons',
    email: 'billing@initech.com',
    company: 'Initech LLC',
    tier: 'Silver',
    defaultQuoteId: 'Q-1044',
  },
  {
    name: 'Elena Rostova',
    email: 'ops@apexlogistics.com',
    company: 'Apex Logistics Inc',
    tier: 'Standard',
    defaultQuoteId: 'Q-1045',
  },
  {
    name: 'Marcus Vance',
    email: 'it-purchasing@nexushealth.org',
    company: 'Nexus Health Systems',
    tier: 'Platinum',
    defaultQuoteId: 'Q-1046',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState<'internal' | 'customer'>('internal');
  const [email, setEmail] = useState('rep1@dealflow360.com');
  const [password, setPassword] = useState('password123');
  const [quoteId, setQuoteId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleInternalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        router.push('/quotations');
      } else {
        setErrorMsg('Invalid email or password. Please check your credentials.');
      }
    } catch {
      setErrorMsg('Failed to connect to authentication gateway.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${apiUrl}/portal/auth/magic-link/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: customerEmail, quoteId: quoteId || undefined }),
      });

      if (res.ok) {
        setMagicLinkSent(true);
      } else {
        const json = await res.json().catch(() => null);
        setErrorMsg(json?.message || 'Failed to request magic link. Check quotation ID & email.');
      }
    } catch {
      setErrorMsg('Network error connecting to portal service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">DealFlow360</h1>
          <p className="text-xs text-gray-400">
            Intelligent B2B Sales Operations &amp; Negotiation Portal
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="grid grid-cols-2 p-1 bg-[#111] border border-[#222] rounded-lg">
          <button
            type="button"
            onClick={() => { setActiveTab('internal'); setErrorMsg(null); }}
            className={`py-1.5 text-xs font-semibold rounded transition ${
              activeTab === 'internal'
                ? 'bg-white text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sales Team Login
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('customer'); setErrorMsg(null); }}
            className={`py-1.5 text-xs font-semibold rounded transition ${
              activeTab === 'customer'
                ? 'bg-white text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Customer Magic Link
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-[#1a0f0f] border border-red-900/50 rounded-lg text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Internal Staff Login */}
        {activeTab === 'internal' && (
          <div className="p-6 bg-[#0c0c0c] border border-[#222] rounded-lg space-y-5">
            <form onSubmit={handleInternalLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
                  placeholder="name@dealflow360.com"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-300">Password</label>
                  <span className="text-[11px] text-gray-500">Default: password123</span>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-white text-black rounded text-xs font-semibold hover:bg-gray-200 transition disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              </button>
            </form>

            {/* Quick Demo Switcher */}
            <div className="pt-4 border-t border-[#1f1f1f] space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                Quick-Select Persona (FR-03 RBAC)
              </div>
              <div className="grid grid-cols-1 gap-2">
                {DEMO_PERSONAS.map((p) => (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => {
                      setEmail(p.email);
                      setPassword('password123');
                    }}
                    className={`text-left p-2.5 rounded border transition ${
                      email === p.email
                        ? 'border-white bg-[#1a1a1a]'
                        : 'border-[#222] bg-[#111] hover:border-[#444]'
                    }`}
                  >
                    <div className="text-xs font-semibold text-white">{p.role}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{p.email}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Customer Magic Link Form */}
        {activeTab === 'customer' && (
          <div className="p-6 bg-[#0c0c0c] border border-[#222] rounded-lg space-y-5">
            {/* Quick Demo Customer Account Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300">Quick-Select Customer Account</label>
              <select
                onChange={(e) => {
                  const selected = DEMO_CUSTOMER_ACCOUNTS.find((c) => c.email === e.target.value);
                  if (selected) {
                    setCustomerEmail(selected.email);
                    if (selected.defaultQuoteId) {
                      setQuoteId(selected.defaultQuoteId);
                    }
                  }
                }}
                className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white focus:outline-none focus:border-white transition"
              >
                <option value="">-- Choose a Customer Account --</option>
                {DEMO_CUSTOMER_ACCOUNTS.map((c) => (
                  <option key={c.email} value={c.email}>
                    {c.company} ({c.name}) - Tier: {c.tier}
                  </option>
                ))}
              </select>
            </div>

            {magicLinkSent ? (
              <div className="space-y-3 text-center py-4">
                <div className="text-xs font-semibold text-white">Access Link Generated</div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  A secure customer session has been generated for{' '}
                  <span className="text-white font-mono">{customerEmail}</span>.
                </p>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/portal/quotes/${quoteId || 'Q-1042'}`)}
                    className="w-full py-2 bg-white text-black rounded text-xs font-semibold hover:bg-gray-200 transition"
                  >
                    Enter Negotiation Room directly →
                  </button>
                  <button
                    type="button"
                    onClick={() => setMagicLinkSent(false)}
                    className="w-full py-1.5 border border-[#333] rounded text-xs text-gray-300 hover:bg-[#1a1a1a] transition"
                  >
                    Send Another Link
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCustomerMagicLink} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">Customer Email</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
                    placeholder="procurement@acme.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">Quotation ID / Token (Optional)</label>
                  <input
                    type="text"
                    value={quoteId}
                    onChange={(e) => setQuoteId(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
                    placeholder="e.g. Q-1042 or leave blank"
                  />
                </div>

                <p className="text-[11px] text-gray-400">
                  Customers receive single-use token links to access the collaborative negotiation room.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-white text-black rounded text-xs font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Request Customer Magic Link'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
