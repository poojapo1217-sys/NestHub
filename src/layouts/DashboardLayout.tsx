import React, { useState } from 'react';
import {
  BedDouble,
  Building2,
  ClipboardList,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  Receipt,
  UserPlus,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { UserRole } from '../types/index.ts';

export type PageRoute =
  | 'tenant-dashboard'
  | 'tenant-bills'
  | 'tenant-complaints'
  | 'food-menu'
  | 'manager-dashboard'
  | 'manager-complaints'
  | 'manager-tenants'
  | 'owner-dashboard'
  | 'owner-beds';

interface NavItem {
  id: PageRoute;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  // Tenant Screens
  {
    id: 'tenant-dashboard',
    label: 'Tenant Dashboard',
    shortLabel: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['TENANT'],
  },
  {
    id: 'tenant-bills',
    label: 'Rent & Electricity',
    shortLabel: 'Bills',
    icon: Receipt,
    roles: ['TENANT'],
  },
  {
    id: 'tenant-complaints',
    label: 'My Complaints',
    shortLabel: 'Complaints',
    icon: MessageSquareWarning,
    roles: ['TENANT'],
  },
  {
    id: 'food-menu',
    label: 'Weekly Food Menu',
    shortLabel: 'Menu',
    icon: UtensilsCrossed,
    roles: ['TENANT', 'MANAGER', 'OWNER'],
  },

  // Manager Screens
  {
    id: 'manager-dashboard',
    label: 'Meter Entry & Ops',
    shortLabel: 'Ops',
    icon: Zap,
    roles: ['MANAGER'],
  },
  {
    id: 'manager-complaints',
    label: 'Complaint Desk',
    shortLabel: 'Complaints',
    icon: ClipboardList,
    roles: ['MANAGER', 'OWNER'],
  },
  {
    id: 'manager-tenants',
    label: 'Tenants & Check-In',
    shortLabel: 'Tenants',
    icon: UserPlus,
    roles: ['MANAGER', 'OWNER'],
  },

  // Owner Screens
  {
    id: 'owner-dashboard',
    label: 'Financial Analytics',
    shortLabel: 'Finance',
    icon: IndianRupee,
    roles: ['OWNER'],
  },
  {
    id: 'owner-beds',
    label: 'Vacant Beds (40)',
    shortLabel: 'Beds',
    icon: BedDouble,
    roles: ['OWNER', 'MANAGER'],
  },
];

interface DashboardLayoutProps {
  activePage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  children: React.ReactNode;
}

export function DashboardLayout({ activePage, onNavigate, children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const currentItem = visibleNav.find((item) => item.id === activePage) || visibleNav[0];

  const handleLogout = async () => {
    const ok = await toast.confirm({
      title: 'Sign out of Comfort Stay PG?',
      message: 'Your current session token will be cleared. You can log back in anytime.',
      confirmLabel: 'Sign Out',
    });
    if (ok) {
      await logout();
      toast.info('Signed out successfully.');
    }
  };

  const roleLabel =
    user.role === 'OWNER'
      ? 'Owner / Admin'
      : user.role === 'MANAGER'
        ? 'PG Manager'
        : 'Resident Tenant';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F294A] text-white">
      {/* Property Lockup */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-white truncate">
              Comfort Stay PG
            </div>
            <div className="text-xs text-slate-300 truncate">
              10 Rooms · 40 Beds
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary Navigation">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activePage;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Account Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="px-2 pb-3">
          <div className="text-sm font-semibold text-white truncate">{user.name}</div>
          <div className="text-xs text-slate-300 truncate mt-0.5">
            {roleLabel} · {user.phone}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 bg-white/10 hover:bg-white/15 rounded-lg transition-colors whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-slate-300 hover:text-white p-1"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">Comfort Stay PG</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-semibold text-slate-900 truncate">
                {currentItem?.label || 'Portal'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{user.name}</span>
              <span aria-hidden="true">·</span>
              <span>{roleLabel}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Quick Nav */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 flex items-center justify-around px-2 py-1.5"
        aria-label="Mobile Quick Navigation"
      >
        {visibleNav.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activePage;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-medium min-w-[60px] ${
                isActive ? 'text-[#2563EB]' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
