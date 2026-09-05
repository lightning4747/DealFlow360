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
    desc: 'Multiple purchases: hardware, cloud SLA, and accessories',
  },
  {
    role: 'Globex Corp (Silver Tier)',
    contact: 'Hank Scorpio',
    email: 'purchasing@globex.com',
    desc: 'Enterprise server clusters and network switches',
  },
  {
    role: 'Initech LLC (Bronze Tier)',
    contact: 'Peter Gibbons',
    email: 'billing@initech.com',
    desc: 'SaaS platform licenses and support packages',
  },
  {
    role: 'Nexus Health (Platinum Tier)',
    contact: 'Marcus Vance',
    email: 'it-purchasing@nexushealth.org',
    desc: 'Hospital campus deployments and compliance retention',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, signup } = useAuth();

  // 4 Explicit Primary Tabs
  const [activeTab, setActiveTab] = useState<'customer_login' | 'staff_login' | 'customer_magic' | 'signup'>('customer_login');

  // Customer Login State
  const [customerEmail, setCustomerEmail] = useState('procurement@acme.com');
  const [customerPassword, setCustomerPassword] = useState('password123');

  // Staff Login State
  const [staffEmail, setStaffEmail] = useState('rep1@dealflow360.com');
  const [staffPassword, setStaffPassword] = useState('password123');

  // Sign Up State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('password123');
  const [signupRole, setSignupRole] = useState<'customer' | 'sales_rep' | 'sales_manager' | 'finance' | 'admin'>('customer');

  // Magic Link State
  const [magicLinkEmail, setMagicLinkEmail] = useState('procurement@acme.com');
  const [magicLinkQuoteId, setMagicLinkQuoteId] = useState('Q-1042');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [generatedPortalUrl, setGeneratedPortalUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [actionLoadingEmail, setActionLoadingEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Customer Email + Password Login Handler
  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const result = await login(customerEmail, customerPassword);
      if (result.success) {
        setSuccessMsg('Customer verified. Loading your orders & quotations...');
        setTimeout(() => router.push('/portal'), 600);
      } else {
        setErrorMsg(result.error || 'Invalid customer credentials. (Default password: password123)');
      }
    } catch {
      setErrorMsg('Failed to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  // Staff Login Handler
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const result = await login(staffEmail, staffPassword);
      if (result.success) {
        router.push('/quotations');
      } else {
        setErrorMsg(result.error || 'Invalid staff credentials. (Default password: password123)');
      }
    } catch {
      setErrorMsg('Failed to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  // Sign Up Handler
  const handleSignup = async (e: React.FormEvent) => {
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
        setSuccessMsg('Account registered successfully! Redirecting...');
        setTimeout(() => {
          if (signupRole === 'customer') {
            router.push('/portal');
          } else {
            router.push('/quotations');
          }
        }, 800);
      } else {
        setErrorMsg(result.error || 'Registration failed. Check your inputs.');
      }
    } catch {
      setErrorMsg('Network error registering account.');
    } finally {
      setLoading(false);
    }
  };

  // Magic Link Handler
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${apiUrl}/portal/auth/magic-link/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: magicLinkEmail, quoteId: magicLinkQuoteId || undefined }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.data?.portalUrl) {
        setMagicLinkSent(true);
        setGeneratedPortalUrl(json.data.portalUrl);
      } else {
        setErrorMsg(json?.message || 'Failed to generate magic link. Check quotation ID & email.');
      }
    } catch {
      setErrorMsg('Network error requesting magic link.');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Fast Actions
  const handleDirectCustomerLogin = async (emailToLogin: string) => {
    setErrorMsg(null);
    setActionLoadingEmail(emailToLogin);
    try {
      const result = await login(emailToLogin, 'password123');
      if (result.success) {
        router.push('/portal');
      } else {
        setErrorMsg(result.error || `Could not login as ${emailToLogin}`);
      }
    } catch {
      setErrorMsg('Authentication error.');
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const handleDirectStaffLogin = async (emailToLogin: string) => {
    setErrorMsg(null);
    setActionLoadingEmail(emailToLogin);
    try {
      const result = await login(emailToLogin, 'password123');
      if (result.success) {
        router.push('/quotations');
      } else {
        setErrorMsg(result.error || `Could not login as ${emailToLogin}`);
      }
    } catch {
      setErrorMsg('Authentication error.');
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
            Intelligent B2B Sales Operations &amp; Customer Purchasing Portal
          </p>
        </div>

        {/* 4 CLEAR AUTH MODE TABS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 p-1 bg-[#111] border border-[#222] rounded-lg text-xs font-semibold gap-1">
          <button
            type="button"
            onClick={() => { setActiveTab('customer_login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-2 px-1 rounded transition text-center ${
              activeTab === 'customer_login'
                ? 'bg-emerald-500 text-black font-bold shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Customer Login
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('staff_login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-2 px-1 rounded transition text-center ${
              activeTab === 'staff_login'
                ? 'bg-white text-black font-bold shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Staff Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('customer_magic'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-2 px-1 rounded transition text-center ${
              activeTab === 'customer_magic'
                ? 'bg-white text-black font-bold shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Magic Link
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('signup'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-2 px-1 rounded transition text-center ${
              activeTab === 'signup'
                ? 'bg-white text-black font-bold shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Sign Up
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

        {/* 1. CUSTOMER LOGIN FORM (EMAIL + PASSWORD) */}
        {activeTab === 'customer_login' && (
          <div className="p-6 bg-[#0c0c0c] border border-emerald-900/40 rounded-lg space-y-5">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h2 className="text-sm font-bold text-white">Customer Account Login</h2>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Log in to your customer account to view all past orders, active quotations, and negotiate terms.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                CUSTOMER PORTAL
              </span>
            </div>

            <form onSubmit={handleCustomerLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Customer Email Address</label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                  placeholder="procurement@acme.com"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-300">Password</label>
                  <span className="text-[11px] text-gray-500 font-mono">Demo: password123</span>
                </div>
                <input
                  type="password"
                  required
                  value={customerPassword}
                  onChange={(e) => setCustomerPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-emerald-500 text-black rounded text-xs font-bold hover:bg-emerald-400 transition disabled:opacity-50"
              >
                {loading ? 'Authenticating Customer...' : 'Log In to Customer Portal →'}
              </button>
            </form>
          </div>
        )}

        {/* 2. STAFF SIGN IN FORM */}
        {activeTab === 'staff_login' && (
          <div className="p-6 bg-[#0c0c0c] border border-[#222] rounded-lg space-y-5">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <div>
                <h2 className="text-sm font-bold text-white">Staff &amp; Enterprise Login</h2>
                <p className="text-[11px] text-gray-400 mt-1">
                  Access internal pipeline, approval governance, fulfillment, and billing engines.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                STAFF WORKSPACE
              </span>
            </div>

            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Staff Work Email</label>
                <input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition font-mono"
                  placeholder="name@dealflow360.com"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-300">Password</label>
                  <span className="text-[11px] text-gray-500 font-mono">Demo: password123</span>
                </div>
                <input
                  type="password"
                  required
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-white text-black rounded text-xs font-bold hover:bg-gray-200 transition disabled:opacity-50"
              >
                {loading ? 'Authenticating Staff...' : 'Sign In to Workspace →'}
              </button>
            </form>
          </div>
        )}

        {/* 3. CUSTOMER MAGIC LINK FORM */}
        {activeTab === 'customer_magic' && (
          <div className="p-6 bg-[#0c0c0c] border border-[#222] rounded-lg space-y-5">
            <div>
              <h2 className="text-sm font-bold text-white">Single-Use Magic Link Access</h2>
              <p className="text-[11px] text-gray-400 mt-1">
                Request a secure, single-use token to open an individual negotiation room without a password.
              </p>
            </div>

            {magicLinkSent && generatedPortalUrl ? (
              <div className="space-y-3 text-center py-4 bg-[#111] border border-[#222] rounded-lg p-4">
                <div className="text-xs font-semibold text-emerald-400">✓ Token Generated Successfully</div>
                <p className="text-xs text-gray-300">
                  Access session ready for <span className="text-white font-mono">{magicLinkEmail}</span>.
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
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">Customer Email</label>
                  <input
                    type="email"
                    required
                    value={magicLinkEmail}
                    onChange={(e) => setMagicLinkEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition font-mono"
                    placeholder="procurement@acme.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-300">Quotation ID / Number</label>
                  <input
                    type="text"
                    value={magicLinkQuoteId}
                    onChange={(e) => setMagicLinkQuoteId(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition font-mono"
                    placeholder="e.g. Q-1042"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-white text-black rounded text-xs font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Request Single-Use Magic Link'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* 4. USER SIGN UP / REGISTRATION FORM */}
        {activeTab === 'signup' && (
          <div className="p-6 bg-[#0c0c0c] border border-[#222] rounded-lg space-y-5">
            <div>
              <h2 className="text-sm font-bold text-white">Create New Account</h2>
              <p className="text-[11px] text-gray-400 mt-1">
                Register as a Customer Buyer or Enterprise Staff Member.
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Account Type (Role)</label>
                <select
                  value={signupRole}
                  onChange={(e: any) => setSignupRole(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white focus:outline-none focus:border-white transition"
                >
                  <option value="customer">Customer (Buyer / Purchasing Account)</option>
                  <option value="sales_rep">Sales Representative</option>
                  <option value="sales_manager">Sales Manager</option>
                  <option value="finance">Finance &amp; Operations</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Full Name or Company Representative</label>
                <input
                  type="text"
                  required
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
                  placeholder="e.g. Sarah Connor"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition font-mono"
                  placeholder="buyer@company.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-[#333] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white transition"
                  placeholder="Minimum 8 characters"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-white text-black rounded text-xs font-bold hover:bg-gray-200 transition disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>
            </form>
          </div>
        )}

        {/* 5. 1-CLICK QUICK-SELECT DEMO PERSONAS CONTAINER */}
        <div className="p-6 bg-[#0c0c0c] border border-[#222] rounded-lg space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              Quick-Select Demo Personas
            </div>
            <span className="text-[10px] text-gray-500 font-mono">1-Click Immediate Login</span>
          </div>

          {/* Section A: Customer Accounts */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Customer Buyer Accounts (Customer Portal)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CUSTOMER_PERSONAS.map((c) => (
                <div
                  key={c.email}
                  className="p-3 rounded border border-emerald-900/40 bg-[#0d140e] hover:border-emerald-600 flex flex-col justify-between space-y-2.5 transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{c.role}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                        CUSTOMER
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-300 mt-0.5">{c.contact} • <span className="font-mono text-[10px] text-gray-400">{c.email}</span></div>
                    <div className="text-[10px] text-gray-400 mt-1">{c.desc}</div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-emerald-950">
                    <button
                      type="button"
                      disabled={actionLoadingEmail === c.email}
                      onClick={() => handleDirectCustomerLogin(c.email)}
                      className="flex-1 py-1.5 px-2 rounded bg-emerald-500 text-black text-[11px] font-bold hover:bg-emerald-400 transition disabled:opacity-50"
                    >
                      {actionLoadingEmail === c.email ? 'Logging in...' : '1-Click Customer Login'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('customer_login');
                        setCustomerEmail(c.email);
                        setCustomerPassword('password123');
                      }}
                      className="py-1.5 px-2 rounded border border-[#333] text-gray-300 text-[10px] hover:bg-[#1a1a1a] transition"
                    >
                      Fill Form
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Internal Enterprise Staff */}
          <div className="space-y-2 pt-3 border-t border-[#1c1c1c]">
            <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
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
                      <span className="text-xs font-bold text-white">{p.role}</span>
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
                      className="flex-1 py-1.5 px-2 rounded bg-white text-black text-[11px] font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                    >
                      {actionLoadingEmail === p.email ? 'Logging in...' : '1-Click Sign In'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('staff_login');
                        setStaffEmail(p.email);
                        setStaffPassword('password123');
                      }}
                      className="py-1.5 px-2 rounded border border-[#333] text-gray-300 text-[10px] hover:bg-[#1a1a1a] transition"
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
