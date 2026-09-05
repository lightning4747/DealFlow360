'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const STAFF_PERSONAS = [
  {
    role: 'Sales Representative',
    name: 'Alice Rep',
    email: 'rep1@dealflow360.com',
    desc: 'Builds quotes, configures items, requests discounts',
  },
  {
    role: 'Sales Manager',
    name: 'Carol Manager',
    email: 'manager@dealflow360.com',
    desc: 'Reviews deals, approves tier-1/tier-2 threshold discounts',
  },
  {
    role: 'Finance & Ops',
    name: 'Dave Finance',
    email: 'finance@dealflow360.com',
    desc: 'Approves high-risk escalations, reviews invoice schedules',
  },
  {
    role: 'Administrator',
    name: 'System Administrator',
    email: 'admin@dealflow360.com',
    desc: 'Manages product catalog, pricing rules, customer tiers',
  },
];

const CUSTOMER_PERSONAS = [
  {
    role: 'Acme Corp (Gold Tier)',
    contact: 'Sarah Connor',
    email: 'procurement@acme.com',
    quoteId: 'Q-1042',
    desc: 'Reviewing hardware quote with requested 18% discount',
  },
  {
    role: 'Globex Corp (Silver Tier)',
    contact: 'Hank Scorpio',
    email: 'purchasing@globex.com',
    quoteId: 'Q-1043',
    desc: 'Reviewing enterprise server & switch bundle',
  },
  {
    role: 'Initech LLC (Bronze Tier)',
    contact: 'Peter Gibbons',
    email: 'billing@initech.com',
    quoteId: 'Q-1044',
    desc: 'Reviewing SaaS platform expansion quote',
  },
  {
    role: 'Nexus Health (Platinum Tier)',
    contact: 'Marcus Vance',
    email: 'it-purchasing@nexushealth.org',
    quoteId: 'Q-1046',
    desc: 'Mission-critical healthcare deployment',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, signup } = useAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'customer'>('signin');
  
  // Sign In State
  const [email, setEmail] = useState('rep1@dealflow360.com');
  const [password, setPassword] = useState('password123');

  // Sign Up State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('password123');
  const [signupRole, setSignupRole] = useState<'sales_rep' | 'sales_manager' | 'finance' | 'admin'>('sales_rep');

  // Customer Magic Link State
  const [quoteId, setQuoteId] = useState('Q-1042');
  const [customerEmail, setCustomerEmail] = useState('procurement@acme.com');

  const [loading, setLoading] = useState(false);
  const [actionLoadingEmail, setActionLoadingEmail] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [generatedPortalUrl, setGeneratedPortalUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleInternalLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        // Read user from localStorage to verify role
        const storedUser = localStorage.getItem('df360_user');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        if (parsed?.role === 'customer') {
          router.push('/portal');
        } else {
          router.push('/quotations');
        }
      } else {
        setErrorMsg(result.error || 'Invalid email or password. Please check your credentials.');
      }
    } catch {
      setErrorMsg('Failed to connect to authentication gateway.');
    } finally {
      setLoading(false);
    }
  };

  const handleInternalSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const result = await signup({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        role: signupRole,
      });
      if (result.success) {
        setSuccessMsg('Account created successfully! Redirecting to workspace...');
        setTimeout(() => {
          if (signupRole === 'customer') {
            router.push('/portal');
          } else {
            router.push('/quotations');
          }
        }, 800);
      } else {
        setErrorMsg(result.error || 'Registration failed. Please check your inputs.');
      }
    } catch {
      setErrorMsg('Network error registering account.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerMagicLink = async (e?: React.FormEvent, customEmail?: string, customQuoteId?: string) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    const targetEmail = customEmail || customerEmail;
    const targetQuote = customQuoteId || quoteId;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${apiUrl}/portal/auth/magic-link/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, quoteId: targetQuote || undefined }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.data?.portalUrl) {
        setMagicLinkSent(true);
        setGeneratedPortalUrl(json.data.portalUrl);
        return json.data.portalUrl;
      } else {
        setErrorMsg(json?.message || 'Failed to request magic link. Check quotation ID & email.');
        return null;
      }
    } catch {
      setErrorMsg('Network error connecting to portal service.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleDirectStaffLogin = async (staffEmail: string) => {
    setErrorMsg(null);
    setActionLoadingEmail(staffEmail);
    try {
      const result = await login(staffEmail, 'password123');
      if (result.success) {
        router.push('/quotations');
      } else {
        setErrorMsg(result.error || `Could not authenticate as ${staffEmail}`);
      }
    } catch {
      setErrorMsg('Authentication gateway error.');
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const handleDirectCustomerEnter = async (cEmail: string, cQuoteId: string) => {
    setErrorMsg(null);
    setActionLoadingEmail(cEmail);
    try {
      // Direct authenticated login for customer account
      const result = await login(cEmail, 'password123');
      if (result.success) {
        router.push('/portal');
      } else {
        // Fallback to direct quote portal if password mismatch
        router.push(`/portal/quotes/${cQuoteId}`);
      }
    } catch {
      router.push(`/portal/quotes/${cQuoteId}`);
    } finally {
      setActionLoadingEmail(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">DealFlow360</h1>
          <p className="text-xs text-gray-400">
            Intelligent B2B Sales Operations, Governed CPQ &amp; Customer Negotiation Portal
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="grid grid-cols-3 p-1 bg-[#111] border border-[#222] rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab('signin'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-2 rounded transition ${
              activeTab === 'signin'
                ? 'bg-white text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Staff Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('signup'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-2 rounded transition ${
              activeTab === 'signup'
                ? 'bg-white text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Staff Account
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('customer'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-2 rounded transition ${
              activeTab === 'customer'
                ? 'bg-white text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Customer Magic Link
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 bg-[#1a0f0f] border border-red-900/50 rounded-lg text-xs text-red-300">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-[#0f1a0f] border border-emerald-900/50 rounded-lg text-xs text-emerald-300">
            {successMsg}
          </div>
        )}

        {/* 1. Internal Staff Login Form */}
        {activeTab === 'signin' && (
          <div className="p-6 bg-[#0c0c0c] border border-[#222] rounded-lg space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Enterprise Workspace Login</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Sign in with your organizational role credentials to access governed quotes and approvals.
              </p>
            </div>

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
                  <span className="text-[11px] text-gray-500 font-mono">Default: password123</span>
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
          </div>
        )}

        {/* 2. Staff Registration / Signup Form */}
        {activeTab === 'signup' && (
          <div className="p-6 bg-[#0c0c0c] border border-[#222] rounded-lg space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Register New Staff User</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Create a new enterprise account with an assigned RBAC role.
              </p>
            </div>

            <form onSubmit={handleInternalSignup} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
                  placeholder="e.g. Eleanor Vance"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Work Email Address</label>
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
                  placeholder="name@dealflow360.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
                    placeholder="Min 8 chars"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">Assigned Role</label>
                  <select
                    value={signupRole}
                    onChange={(e: any) => setSignupRole(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white focus:outline-none focus:border-white transition"
                  >
                    <option value="sales_rep">Sales Representative</option>
                    <option value="sales_manager">Sales Manager</option>
                    <option value="finance">Finance &amp; Operations</option>
                    <option value="admin">Administrator</option>
                    <option value="customer">Customer (Purchasing / Buyer)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-white text-black rounded text-xs font-semibold hover:bg-gray-200 transition disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>
            </form>
          </div>
        )}

        {/* 3. Customer Magic Link Form */}
        {activeTab === 'customer' && (
          <div className="p-6 bg-[#0c0c0c] border border-[#222] rounded-lg space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Customer Portal Access</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Generate a secure, single-use token link to enter the live customer negotiation room.
              </p>
            </div>

            {magicLinkSent && generatedPortalUrl ? (
              <div className="space-y-3 text-center py-4 bg-[#111] border border-[#222] rounded-lg p-4">
                <div className="text-xs font-semibold text-emerald-400">✓ Token Generated Successfully</div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Direct access session created for{' '}
                  <span className="text-white font-mono">{customerEmail}</span>.
                </p>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(generatedPortalUrl)}
                    className="w-full py-2 bg-white text-black rounded text-xs font-semibold hover:bg-gray-200 transition"
                  >
                    Enter Negotiation Room Directly →
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMagicLinkSent(false); setGeneratedPortalUrl(null); }}
                    className="w-full py-1.5 border border-[#333] rounded text-xs text-gray-300 hover:bg-[#1a1a1a] transition"
                  >
                    Generate Another Link
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => handleCustomerMagicLink(e)} className="space-y-4">
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
                  <label className="text-xs font-medium text-gray-300">Quotation ID / Number</label>
                  <input
                    type="text"
                    value={quoteId}
                    onChange={(e) => setQuoteId(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition font-mono"
                    placeholder="e.g. Q-1042"
                  />
                </div>

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

        {/* 4. Quick-Select Demo Personas (1-Click Actions Without Unwanted Tab Toggling) */}
        <div className="p-6 bg-[#0c0c0c] border border-[#222] rounded-lg space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-white uppercase tracking-wider">
              Quick-Select Demo Personas
            </div>
            <span className="text-[10px] text-gray-500 font-mono">1-Click Fast Switch</span>
          </div>

          {/* Section A: Internal Enterprise Staff */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Enterprise Staff Accounts (Workspace)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STAFF_PERSONAS.map((p) => (
                <div
                  key={p.email}
                  className="p-3 rounded border border-[#222] bg-[#111] hover:border-[#3a3a3a] flex flex-col justify-between space-y-2.5 transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{p.role}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-blue-950 text-blue-300 border border-blue-800">
                        STAFF
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{p.name} • <span className="font-mono text-[10px] text-gray-500">{p.email}</span></div>
                    <div className="text-[10px] text-gray-500 mt-1">{p.desc}</div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-[#1c1c1c]">
                    <button
                      type="button"
                      disabled={actionLoadingEmail === p.email}
                      onClick={() => handleDirectStaffLogin(p.email)}
                      className="flex-1 py-1 px-2 rounded bg-white text-black text-[11px] font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                    >
                      {actionLoadingEmail === p.email ? 'Logging in...' : '1-Click Sign In'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('signin');
                        setEmail(p.email);
                        setPassword('password123');
                      }}
                      className="py-1 px-2 rounded border border-[#333] text-gray-300 text-[10px] hover:bg-[#1a1a1a] transition"
                    >
                      Fill Form
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: External Customer Accounts */}
          <div className="space-y-2 pt-3 border-t border-[#1c1c1c]">
            <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Customer Accounts (Portal Negotiation Room)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CUSTOMER_PERSONAS.map((c) => (
                <div
                  key={c.email}
                  className="p-3 rounded border border-[#222] bg-[#111] hover:border-[#3a3a3a] flex flex-col justify-between space-y-2.5 transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{c.role}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                        PORTAL
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{c.contact} • <span className="font-mono text-[10px] text-gray-500">{c.quoteId}</span></div>
                    <div className="text-[10px] text-gray-500 mt-1">{c.desc}</div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-[#1c1c1c]">
                    <button
                      type="button"
                      disabled={actionLoadingEmail === c.email}
                      onClick={() => handleDirectCustomerEnter(c.email, c.quoteId)}
                      className="flex-1 py-1 px-2 rounded bg-emerald-500 text-black text-[11px] font-semibold hover:bg-emerald-400 transition disabled:opacity-50"
                    >
                      {actionLoadingEmail === c.email ? 'Connecting...' : 'Enter Portal Room'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('customer');
                        setCustomerEmail(c.email);
                        setQuoteId(c.quoteId);
                      }}
                      className="py-1 px-2 rounded border border-[#333] text-gray-300 text-[10px] hover:bg-[#1a1a1a] transition"
                    >
                      Fill Form
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
