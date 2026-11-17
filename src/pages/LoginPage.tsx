import React, { useState } from 'react';
import { Building2, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest } from '../services/api.ts';

const DEMO_ACCOUNTS = [
  {
    roleLabel: 'Owner / Admin',
    name: 'Vikramaditya Rao',
    email: 'owner@comfortstay.in',
    pass: 'Owner@123',
    scope: 'Financial Analytics & 40-Bed Inventory',
  },
  {
    roleLabel: 'PG Manager',
    name: 'Suresh Nair',
    email: 'manager@comfortstay.in',
    pass: 'Manager@123',
    scope: 'Meter Entry, Complaints & Tenant Check-In',
  },
  {
    roleLabel: 'Resident Tenant',
    name: 'Aarav Sharma (Room 101)',
    email: 'tenant@comfortstay.in',
    pass: 'Tenant@123',
    scope: 'Rent Bills, Complaints & Weekly Menu',
  },
];

export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter your email or phone number and password.');
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(identifier.trim(), password, rememberMe);
      toast.success(`Welcome back, ${user.name}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) return;
    setForgotSubmitting(true);
    try {
      const data = await apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: forgotIdentifier.trim() }),
      });
      toast.success(data.message);
      setForgotOpen(false);
      setForgotIdentifier('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to send reset request.');
    } finally {
      setForgotSubmitting(false);
    }
  };

  const fillDemo = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Left Institutional Overview Panel */}
      <div className="lg:w-[46%] bg-[#0F294A] text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Comfort Stay PG</span>
          </div>

          <h1 className="mt-10 text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-balance">
            PG &amp; Hostel Management System
          </h1>
          <p className="mt-4 text-slate-300 text-base leading-relaxed max-w-md">
            Centralized operations portal for resident billing, room-wise electricity metering,
            bed allocation, complaint resolution, and financial reporting.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4 max-w-md">
            <div className="bg-white/10 rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold tabular-nums">10 Rooms</div>
              <div className="text-xs text-slate-300 mt-1">Rooms 101 to 110 across 2 floors</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold tabular-nums">40 Beds</div>
              <div className="text-xs text-slate-300 mt-1">Real-time vacancy &amp; stay tracking</div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex items-center gap-2.5 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
          <span>Role-based JWT authentication for Tenants, Managers, and Owners</span>
        </div>
      </div>

      {/* Right Login & Demo Credentials Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-md space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-7 sm:p-8 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900">Sign in to your portal</h2>
            <p className="text-sm text-slate-500 mt-1">
              Use your registered email or phone number to access your role dashboard.
            </p>

            {errorMsg && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="login-identifier" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email or Phone Number
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. owner@comfortstay.in or 9845010001"
                    autoComplete="username"
                    className="w-full h-10 pl-10 pr-3.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full h-10 pl-10 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-sm font-medium text-[#2563EB] hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 mt-2 bg-[#0F294A] hover:bg-[#1E3A8A] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Development Demo Credentials */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-700">
                Sample Demo Accounts (Click to Autofill)
              </span>
              <span className="text-[11px] text-slate-400">Development Only</span>
            </div>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc.email, acc.pass)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900">
                      {acc.roleLabel} · {acc.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {acc.email} · {acc.scope}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-[#2563EB] shrink-0">Use</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-[#0F294A]" />
                <h3 className="text-base font-semibold text-slate-900">Reset Account Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mt-2">
              Enter your registered email address or mobile number to request a password reset.
            </p>
            <form onSubmit={handleForgotSubmit} className="mt-4 space-y-4">
              <input
                type="text"
                required
                value={forgotIdentifier}
                onChange={(e) => setForgotIdentifier(e.target.value)}
                placeholder="Email or Phone Number"
                className="w-full h-10 px-3.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0F294A] rounded-lg hover:bg-[#1E3A8A] disabled:opacity-60"
                >
                  {forgotSubmitting ? 'Sending...' : 'Request Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
