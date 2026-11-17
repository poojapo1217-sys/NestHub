import { useEffect, useState } from 'react';
import {
  BedDouble,
  Bell,
  CheckCheck,
  IndianRupee,
  MessageSquarePlus,
  Receipt,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState.tsx';
import { KpiCard } from '../components/KpiCard.tsx';
import { LoadingState } from '../components/LoadingState.tsx';
import { StatusTag } from '../components/StatusTag.tsx';
import { useToast } from '../context/ToastContext.tsx';
import type { PageRoute } from '../layouts/DashboardLayout.tsx';
import { apiRequest } from '../services/api.ts';
import type { Complaint, ElectricityBill, FoodMenuItem, NotificationItem, RentPayment, TenantProfile } from '../types/index.ts';
import { formatCurrency, formatDate, formatMonth } from '../utils/format.ts';

interface TenantDashboardData {
  profile: TenantProfile;
  pendingAmount: number;
  lastPayment: RentPayment | null;
  latestInvoice: RentPayment | null;
  latestElectricity: ElectricityBill | null;
  complaintSummary: {
    pending: number;
    inProgress: number;
    resolved: number;
    total: number;
  };
  recentComplaints: Complaint[];
  todayDay: string;
  todayMenu: FoodMenuItem[];
  notifications: NotificationItem[];
  deposit: {
    amount: number;
    deposit_date: string;
    refund_amount: number;
    status: string;
  } | null;
}

export function TenantDashboardPage({ onNavigate }: { onNavigate: (page: PageRoute) => void }) {
  const toast = useToast();
  const [data, setData] = useState<TenantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<TenantDashboardData>('/dashboard/tenant');
      setData(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to load tenant dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'POST' });
      toast.success('All notifications marked as read.');
      void loadDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark notifications read.');
    }
  };

  if (loading) return <LoadingState />;
  if (!data) {
    return (
      <EmptyState
        icon={BedDouble}
        title="Dashboard unavailable"
        description="We could not retrieve your resident profile right now."
        actionLabel="Retry"
        onAction={() => void loadDashboard()}
      />
    );
  }

  const { profile, pendingAmount, lastPayment, latestInvoice, latestElectricity, complaintSummary, todayDay, todayMenu, notifications, deposit } = data;

  return (
    <div className="space-y-6">
      {/* Welcome & Profile Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Resident ID {profile.tenant_code} · Joined {formatDate(profile.joining_date)}
          </p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            Welcome back, {profile.name}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Room {profile.room_number || '—'} · Bed {profile.bed_number || '—'} · Floor {profile.floor || '—'} ({profile.room_type || 'Standard'})
          </p>
        </div>

        {/* 4 Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('tenant-bills')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F294A] hover:bg-[#1E3A8A] rounded-lg transition-colors whitespace-nowrap"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>View Rent</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('tenant-bills')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#0F294A] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>View Electricity Bill</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('tenant-complaints')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F766E] hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>Submit Complaint</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('food-menu')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>View Food Menu</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Room & Bed"
          value={profile.room_number ? `Rm ${profile.room_number} · ${profile.bed_number?.split('-').pop()}` : 'Unassigned'}
          subtitle={profile.room_type || 'Active Allocation'}
          icon={BedDouble}
          tone="navy"
        />
        <KpiCard
          title="Monthly Rent"
          value={formatCurrency(profile.monthly_rent)}
          subtitle={deposit ? `Deposit Held: ${formatCurrency(deposit.amount)}` : 'Standard tariff'}
          icon={IndianRupee}
          tone="blue"
        />
        <KpiCard
          title="Room Electricity Bill"
          value={latestElectricity ? formatCurrency(latestElectricity.total_amount) : '₹ 0'}
          subtitle={
            latestElectricity
              ? `${latestElectricity.units_consumed} units (${formatMonth(latestElectricity.billing_month)})`
              : 'No meter reading yet'
          }
          icon={Zap}
          tone="teal"
        />
        <KpiCard
          title="Pending Amount"
          value={formatCurrency(pendingAmount)}
          subtitle={pendingAmount > 0 ? 'Payment due for current cycle' : 'All dues cleared'}
          icon={Receipt}
          tone={pendingAmount > 0 ? 'amber' : 'teal'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment & Complaint Status */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Billing &amp; Payment Summary</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest cycle status and recent confirmed transaction
                </p>
              </div>
              {latestInvoice && <StatusTag status={latestInvoice.payment_status} />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5">
              <div>
                <div className="text-xs font-medium text-slate-500">Current / Latest Invoice</div>
                {latestInvoice ? (
                  <div className="mt-2 space-y-1.5">
                    <div className="text-lg font-bold text-slate-900 tabular-nums">
                      {formatCurrency(latestInvoice.total_amount)}
                    </div>
                    <div className="text-xs text-slate-600">
                      Cycle: {formatMonth(latestInvoice.payment_month)} · ID:{' '}
                      <span className="font-mono">{latestInvoice.transaction_id}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Rent {formatCurrency(latestInvoice.amount)} + Electricity {formatCurrency(latestInvoice.electricity_share)}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mt-2">No invoices generated yet.</p>
                )}
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500">Last Confirmed Payment</div>
                {lastPayment ? (
                  <div className="mt-2 space-y-1.5">
                    <div className="text-lg font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(lastPayment.total_amount)}
                    </div>
                    <div className="text-xs text-slate-600">
                      Paid on {formatDate(lastPayment.payment_date)} via {lastPayment.payment_method}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {lastPayment.transaction_id}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mt-2">No completed payments on record.</p>
                )}
              </div>
            </div>
          </div>

          {/* Profile & Complaints Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h3 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-100">
                Resident Profile
              </h3>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="font-medium text-slate-900 truncate">{profile.email}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Phone</dt>
                  <dd className="font-medium text-slate-900 tabular-nums">{profile.phone}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Emergency Contact</dt>
                  <dd className="font-medium text-slate-900 tabular-nums">{profile.emergency_contact}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Home City</dt>
                  <dd className="font-medium text-slate-900 text-right">{profile.address || '—'}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-semibold text-slate-900">Complaint Status</h3>
                  <button
                    type="button"
                    onClick={() => onNavigate('tenant-complaints')}
                    className="text-xs font-semibold text-[#2563EB] hover:underline"
                  >
                    Manage
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-100 text-center">
                    <div className="text-xl font-bold text-amber-800 tabular-nums">
                      {complaintSummary.pending}
                    </div>
                    <div className="text-[11px] font-medium text-amber-700 mt-0.5">Pending</div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-center">
                    <div className="text-xl font-bold text-blue-800 tabular-nums">
                      {complaintSummary.inProgress}
                    </div>
                    <div className="text-[11px] font-medium text-blue-700 mt-0.5">In Progress</div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 text-center">
                    <div className="text-xl font-bold text-emerald-800 tabular-nums">
                      {complaintSummary.resolved}
                    </div>
                    <div className="text-[11px] font-medium text-emerald-700 mt-0.5">Resolved</div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('tenant-complaints')}
                className="mt-4 w-full py-2 text-xs font-semibold text-[#0F294A] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Log a Maintenance Request
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Today's Menu & Notifications */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Today&apos;s Menu</h3>
                <p className="text-xs text-slate-500">{todayDay}</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('food-menu')}
                className="text-xs font-semibold text-[#2563EB] hover:underline"
              >
                Full Week
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {todayMenu.map((item) => (
                <div key={item.menu_id} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="text-xs font-semibold text-[#0F766E]">{item.meal_type}</div>
                  <div className="text-sm text-slate-700 mt-0.5 leading-snug">{item.food_items}</div>
                </div>
              ))}
              {todayMenu.length === 0 && (
                <p className="text-sm text-slate-500">Menu not published for today.</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-600" />
                <h3 className="text-base font-semibold text-slate-900">Notifications</h3>
              </div>
              {notifications.some((n) => n.status === 'UNREAD') && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark read</span>
                </button>
              )}
            </div>
            <div className="mt-4 space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.notification_id}
                  className={`p-3 rounded-lg text-xs leading-relaxed border ${
                    n.status === 'UNREAD'
                      ? 'bg-blue-50/50 border-blue-100 text-slate-800 font-medium'
                      : 'bg-slate-50 border-slate-100 text-slate-600'
                  }`}
                >
                  {n.message}
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-sm text-slate-500">No recent alerts.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
