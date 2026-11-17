import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  IndianRupee,
  Plus,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '../components/EmptyState.tsx';
import { KpiCard } from '../components/KpiCard.tsx';
import { LoadingState } from '../components/LoadingState.tsx';
import { StatusTag } from '../components/StatusTag.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest } from '../services/api.ts';
import type { DepositRecord, ExpenseRecord, RentPayment } from '../types/index.ts';
import {
  downloadReceiptHtml,
  exportToCsv,
  formatCurrency,
  formatDate,
  formatMonth,
  getCurrentBillingMonth,
} from '../utils/format.ts';

interface OwnerDashboardResponse {
  selectedMonth: string;
  availableMonths: string[];
  kpis: {
    monthlyRentCollected: number;
    pendingRent: number;
    totalSecurityDeposits: number;
    electricityCollections: number;
    electricityBilled: number;
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
  };
  charts: {
    monthlySeries: Array<{
      month: string;
      rentCollected: number;
      electricityCollected: number;
      pendingRent: number;
      totalRevenue: number;
      expenses: number;
      netIncome: number;
    }>;
    paymentStatusBreakdown: Array<{ name: string; value: number; amount: number }>;
    roomOccupancy: Array<{
      room_number: string;
      occupied: number;
      vacant: number;
      maintenance: number;
    }>;
  };
  tables: {
    recentTransactions: RentPayment[];
    pendingRentList: RentPayment[];
    deposits: DepositRecord[];
    expenses: ExpenseRecord[];
  };
}

const PIE_COLORS = ['#0F766E', '#F59E0B', '#EF4444'];

export function OwnerFinancialDashboardPage() {
  const toast = useToast();

  const [selectedMonth, setSelectedMonth] = useState(getCurrentBillingMonth());
  const [data, setData] = useState<OwnerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'transactions' | 'pending' | 'deposits' | 'expenses'>(
    'transactions'
  );

  // Add Expense Modal
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expCategory, setExpCategory] = useState('Maintenance');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));

  // Refund Deposit Modal
  const [refundDeposit, setRefundDeposit] = useState<DepositRecord | null>(null);
  const [refundAmount, setRefundAmount] = useState('0');

  const loadDashboard = async (month: string) => {
    setLoading(true);
    try {
      const res = await apiRequest<OwnerDashboardResponse>(
        `/dashboard/owner?month=${encodeURIComponent(month)}`
      );
      setData(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load financial dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard(selectedMonth);
  }, [selectedMonth]);

  const handleGenerateInvoices = async () => {
    try {
      const res = await apiRequest<{ message: string }>('/rent', {
        method: 'POST',
        body: JSON.stringify({ action: 'GENERATE_INVOICES', payment_month: selectedMonth }),
      });
      toast.success(res.message);
      void loadDashboard(selectedMonth);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate invoices.');
    }
  };

  const handleMarkPaid = async (payment: RentPayment) => {
    const ok = await toast.confirm({
      title: `Confirm Rent Receipt for ${payment.tenant_name}?`,
      message: `Mark ${formatMonth(payment.payment_month)} invoice (${formatCurrency(payment.total_amount)}) as Paid.`,
      confirmLabel: 'Confirm Paid',
    });
    if (!ok) return;
    try {
      const res = await apiRequest<{ message: string }>('/rent', {
        method: 'POST',
        body: JSON.stringify({ payment_id: payment.payment_id, payment_method: 'Bank Transfer' }),
      });
      toast.success(res.message);
      void loadDashboard(selectedMonth);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment update failed.');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<{ message: string }>('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category: expCategory,
          description: expDesc.trim(),
          amount: Number(expAmount),
          expense_date: expDate,
        }),
      });
      toast.success(res.message);
      setExpenseModalOpen(false);
      setExpDesc('');
      setExpAmount('');
      void loadDashboard(selectedMonth);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add expense.');
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundDeposit) return;
    try {
      const res = await apiRequest<{ message: string }>('/deposits', {
        method: 'POST',
        body: JSON.stringify({
          action: 'REFUND',
          deposit_id: refundDeposit.deposit_id,
          refund_amount: Number(refundAmount),
        }),
      });
      toast.success(res.message);
      setRefundDeposit(null);
      void loadDashboard(selectedMonth);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update deposit refund.');
    }
  };

  const filteredTransactions = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.tables.recentTransactions;
    return data.tables.recentTransactions.filter((t) =>
      `${t.tenant_name} ${t.tenant_code} ${t.transaction_id} ${t.room_number || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [data, search]);

  const filteredPending = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.tables.pendingRentList;
    return data.tables.pendingRentList.filter((t) =>
      `${t.tenant_name} ${t.tenant_code} ${t.room_number || ''}`.toLowerCase().includes(q)
    );
  }, [data, search]);

  const filteredDeposits = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.tables.deposits;
    return data.tables.deposits.filter((d) =>
      `${d.tenant_name} ${d.tenant_code} ${d.room_number || ''}`.toLowerCase().includes(q)
    );
  }, [data, search]);

  const handleExportCsv = () => {
    if (!data) return;
    exportToCsv(
      `ComfortStay_Financial_Report_${selectedMonth}.csv`,
      ['Transaction ID', 'Tenant', 'Code', 'Room', 'Month', 'Rent', 'Electricity', 'Total', 'Status', 'Date'],
      filteredTransactions.map((t) => [
        t.transaction_id,
        t.tenant_name,
        t.tenant_code,
        t.room_number || '',
        t.payment_month,
        t.amount,
        t.electricity_share,
        t.total_amount,
        t.payment_status,
        t.payment_date || '',
      ])
    );
    toast.success(`Exported CSV report for ${formatMonth(selectedMonth)}.`);
  };

  if (loading || !data) return <LoadingState />;

  const { kpis, charts, tables } = data;

  return (
    <div className="space-y-6">
      {/* Control Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Reporting Month &amp; Year
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 px-3 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <div className="relative flex-1 min-w-[220px]">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Search Tenant Records
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, ID, room, TXN..."
                className="w-full h-9 pl-9 pr-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleGenerateInvoices}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F294A] bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate {formatMonth(selectedMonth)} Invoices</span>
          </button>
          <button
            type="button"
            onClick={() => setExpenseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F766E] hover:bg-teal-800 rounded-lg whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F294A] hover:bg-[#1E3A8A] rounded-lg whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 7 Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Monthly Rent Collected"
          value={formatCurrency(kpis.monthlyRentCollected)}
          subtitle={`Cycle: ${formatMonth(selectedMonth)}`}
          icon={IndianRupee}
          tone="teal"
        />
        <KpiCard
          title="Pending Rent"
          value={formatCurrency(kpis.pendingRent)}
          subtitle={`${tables.pendingRentList.length} pending invoice(s)`}
          icon={AlertCircle}
          tone={kpis.pendingRent > 0 ? 'amber' : 'teal'}
        />
        <KpiCard
          title="Electricity Collections"
          value={formatCurrency(kpis.electricityCollections)}
          subtitle={`Room Meters Billed: ${formatCurrency(kpis.electricityBilled)}`}
          icon={Zap}
          tone="blue"
        />
        <KpiCard
          title="Security Deposits Held"
          value={formatCurrency(kpis.totalSecurityDeposits)}
          subtitle="Net held across all residents"
          icon={ShieldCheck}
          tone="navy"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Total Income"
          value={formatCurrency(kpis.totalIncome)}
          subtitle="Rent + Electricity + Other confirmed"
          icon={TrendingUp}
          tone="teal"
        />
        <KpiCard
          title="Total Expenses"
          value={formatCurrency(kpis.totalExpenses)}
          subtitle={`${tables.expenses.length} recorded expense(s)`}
          icon={TrendingDown}
          tone="red"
        />
        <KpiCard
          title="Net Income"
          value={formatCurrency(kpis.netIncome)}
          subtitle="Total Income − Total Expenses"
          icon={Wallet}
          tone={kpis.netIncome >= 0 ? 'navy' : 'red'}
        />
      </div>

      {/* 4 Recharts Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly Rent Collection */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h3 className="text-base font-semibold text-slate-900">Monthly Rent Collection</h3>
          <p className="text-xs text-slate-500 mb-4">Collected vs Pending rent across billing months</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(val) => formatCurrency(Number(val || 0))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="rentCollected" name="Rent Collected" fill="#0F294A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pendingRent" name="Pending Rent" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Monthly Revenue vs Expenses */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h3 className="text-base font-semibold text-slate-900">Monthly Revenue vs Expenses</h3>
          <p className="text-xs text-slate-500 mb-4">Cash inflow vs operational expenses trend</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(val) => formatCurrency(Number(val || 0))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="totalRevenue"
                  name="Total Revenue"
                  stroke="#0F766E"
                  fill="#0F766E"
                  fillOpacity={0.18}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.12}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Payment Status Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h3 className="text-base font-semibold text-slate-900">
            Payment Status Breakdown ({formatMonth(selectedMonth)})
          </h3>
          <p className="text-xs text-slate-500 mb-4">Invoice count distribution by settlement status</p>
          <div className="h-64">
            {charts.paymentStatusBreakdown.length === 0 ? (
              <EmptyState
                icon={IndianRupee}
                title="No invoices for this month"
                description="Generate monthly invoices above to view payment status analytics."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.paymentStatusBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={88}
                    paddingAngle={3}
                  >
                    {charts.paymentStatusBreakdown.map((entry, idx) => (
                      <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name, item) => [
                      `${Number(val || 0)} invoice(s) · ${formatCurrency((item?.payload as { amount?: number } | undefined)?.amount || 0)}`,
                      String(name || ''),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: Room Occupancy Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h3 className="text-base font-semibold text-slate-900">Room-Wise Bed Occupancy</h3>
          <p className="text-xs text-slate-500 mb-4">40-bed distribution across Rooms 101 to 110</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.roomOccupancy}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="room_number" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} domain={[0, 4]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="occupied" name="Occupied" stackId="a" fill="#2563EB" />
                <Bar dataKey="vacant" name="Vacant" stackId="a" fill="#10B981" />
                <Bar dataKey="maintenance" name="Maintenance" stackId="a" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabbed Financial Ledgers */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                ['transactions', 'Recent & Tenant Payments'],
                ['pending', `Pending Rent (${filteredPending.length})`],
                ['deposits', 'Deposit History'],
                ['expenses', `Expenses (${tables.expenses.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTab === key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'transactions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Transaction ID</th>
                  <th className="px-5 py-3">Tenant</th>
                  <th className="px-5 py-3">Room</th>
                  <th className="px-5 py-3">Month</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((t) => (
                  <tr key={t.payment_id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-xs text-slate-700">{t.transaction_id}</td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-slate-900">{t.tenant_name}</span>
                      <span className="text-xs text-slate-400 ml-1.5">{t.tenant_code}</span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">
                      Rm {t.room_number || '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-700">
                      {formatMonth(t.payment_month)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900">
                      {formatCurrency(t.total_amount)}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatDate(t.payment_date)}</td>
                    <td className="px-5 py-3">
                      <StatusTag status={t.payment_status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {t.payment_status === 'PAID' ? (
                        <button
                          type="button"
                          onClick={() => downloadReceiptHtml(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#0F294A] bg-slate-100 hover:bg-slate-200 rounded-md"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleMarkPaid(t)}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-md"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="overflow-x-auto">
            {filteredPending.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={IndianRupee}
                  title="Zero pending dues"
                  description={`All invoices for ${formatMonth(selectedMonth)} have been settled.`}
                />
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Invoice Ref</th>
                    <th className="px-5 py-3">Tenant</th>
                    <th className="px-5 py-3">Room</th>
                    <th className="px-5 py-3 text-right">Rent</th>
                    <th className="px-5 py-3 text-right">Electricity</th>
                    <th className="px-5 py-3 text-right">Total Due</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPending.map((p) => (
                    <tr key={p.payment_id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-mono text-xs">{p.transaction_id}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">{p.tenant_name}</td>
                      <td className="px-5 py-3 font-mono text-xs">Rm {p.room_number || '—'}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(p.amount)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatCurrency(p.electricity_share)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-bold text-amber-800">
                        {formatCurrency(p.total_amount)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusTag status={p.payment_status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleMarkPaid(p)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-md"
                        >
                          Record Payment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'deposits' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Tenant</th>
                  <th className="px-5 py-3">Room</th>
                  <th className="px-5 py-3">Deposit Date</th>
                  <th className="px-5 py-3 text-right">Deposit Amount</th>
                  <th className="px-5 py-3 text-right">Refunded</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeposits.map((d) => (
                  <tr key={d.deposit_id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <span className="font-medium text-slate-900">{d.tenant_name}</span>
                      <span className="text-xs text-slate-400 ml-1.5">{d.tenant_code}</span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">Rm {d.room_number || '—'}</td>
                    <td className="px-5 py-3 text-xs text-slate-600">{formatDate(d.deposit_date)}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold">
                      {formatCurrency(d.amount)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-600">
                      {formatCurrency(d.refund_amount)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusTag status={d.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setRefundDeposit(d);
                          setRefundAmount(String(d.amount));
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
                      >
                        Process Refund
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="overflow-x-auto">
            {tables.expenses.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Wallet}
                  title="No expenses for this month"
                  description="Use Record Expense above to log utility, staff, or kitchen expenditures."
                />
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tables.expenses.map((exp) => (
                    <tr key={exp.expense_id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 text-xs text-slate-600">{formatDate(exp.expense_date)}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">{exp.category}</td>
                      <td className="px-5 py-3 text-slate-600">{exp.description}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-bold text-red-700">
                        {formatCurrency(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Record PG Expense</h3>
              <button type="button" onClick={() => setExpenseModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg"
                >
                  <option value="Electricity Utility">Electricity Utility</option>
                  <option value="Groceries & Kitchen">Groceries &amp; Kitchen</option>
                  <option value="Staff Salaries">Staff Salaries</option>
                  <option value="Internet & Wi-Fi">Internet &amp; Wi-Fi</option>
                  <option value="Water & Tanker">Water &amp; Tanker</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="e.g. Solar geyser valve replacement"
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full h-9 px-3 text-sm tabular-nums border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0F294A] rounded-lg"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refund Deposit Modal */}
      {refundDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">
                Deposit Refund · {refundDeposit.tenant_name}
              </h3>
              <button type="button" onClick={() => setRefundDeposit(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRefundSubmit} className="mt-4 space-y-3">
              <p className="text-xs text-slate-600">
                Original deposit held: <strong className="tabular-nums">{formatCurrency(refundDeposit.amount)}</strong>
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Refund Amount (₹)</label>
                <input
                  type="number"
                  min={0}
                  max={refundDeposit.amount}
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full h-9 px-3 text-sm tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundDeposit(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0F294A] rounded-lg"
                >
                  Update Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
