import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Download,
  IndianRupee,
  Receipt,
  X,
  Zap,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState.tsx';
import { KpiCard } from '../components/KpiCard.tsx';
import { LoadingState } from '../components/LoadingState.tsx';
import { StatusTag } from '../components/StatusTag.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest } from '../services/api.ts';
import type { ElectricityBill, RentPayment } from '../types/index.ts';
import { downloadReceiptHtml, formatCurrency, formatDate, formatMonth } from '../utils/format.ts';

export function RentAndElectricityPage() {
  const toast = useToast();
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [loading, setLoading] = useState(true);

  // Demo payment workflow modal
  const [payingInvoice, setPayingInvoice] = useState<RentPayment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI (Demo)');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    ok: boolean;
    message: string;
    payment?: RentPayment;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rentRes, elecRes] = await Promise.all([
        apiRequest<{ payments: RentPayment[] }>('/rent'),
        apiRequest<{ bills: ElectricityBill[] }>('/electricity'),
      ]);
      setPayments(rentRes.payments);
      setBills(elecRes.bills);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load billing details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openPayModal = (invoice: RentPayment) => {
    setPayingInvoice(invoice);
    setPaymentMethod('UPI (Demo)');
    setSimulateFailure(false);
    setPaymentResult(null);
  };

  const handleConfirmPayment = async () => {
    if (!payingInvoice) return;
    setProcessing(true);
    setPaymentResult(null);
    try {
      const res = await apiRequest<{ message: string; payment: RentPayment }>('/rent', {
        method: 'POST',
        body: JSON.stringify({
          payment_id: payingInvoice.payment_id,
          payment_method: paymentMethod,
          simulate_failure: simulateFailure,
        }),
      });
      setPaymentResult({
        ok: true,
        message: res.message,
        payment: { ...payingInvoice, ...res.payment },
      });
      toast.success(res.message);
      void loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Demo payment failed.';
      setPaymentResult({ ok: false, message: msg });
      toast.error(msg);
      void loadData();
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <LoadingState />;

  const latestBill = bills[0] || null;
  const pendingInvoices = payments.filter((p) => p.payment_status !== 'PAID');
  const pendingTotal = pendingInvoices.reduce((acc, p) => acc + Number(p.total_amount || 0), 0);
  const latestInvoice = payments[0] || null;

  return (
    <div className="space-y-6">
      {/* Top KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Monthly Room Rent"
          value={latestInvoice ? formatCurrency(latestInvoice.amount) : '₹ 0'}
          subtitle={latestInvoice ? `Cycle: ${formatMonth(latestInvoice.payment_month)}` : 'No invoice'}
          icon={IndianRupee}
          tone="navy"
        />
        <KpiCard
          title="Room Electricity Bill"
          value={latestBill ? formatCurrency(latestBill.total_amount) : '₹ 0'}
          subtitle={
            latestBill
              ? `${latestBill.units_consumed} units × ${formatCurrency(latestBill.rate_per_unit)}/unit`
              : 'No meter log'
          }
          icon={Zap}
          tone="teal"
        />
        <KpiCard
          title="Your Electricity Share"
          value={latestInvoice ? formatCurrency(latestInvoice.electricity_share) : '₹ 0'}
          subtitle={
            latestBill && latestBill.active_occupants
              ? `Split across ${latestBill.active_occupants} active bed(s)`
              : 'Room meter share'
          }
          icon={Receipt}
          tone="blue"
        />
        <KpiCard
          title="Pending Payment"
          value={formatCurrency(pendingTotal)}
          subtitle={`${pendingInvoices.length} unpaid invoice(s)`}
          icon={CreditCard}
          tone={pendingTotal > 0 ? 'amber' : 'teal'}
        />
      </div>

      {/* Pending Invoice Banner (if any) */}
      {pendingInvoices.map((inv) => (
        <div
          key={inv.payment_id}
          className="bg-white border border-amber-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-slate-900">
                {formatMonth(inv.payment_month)} Rent &amp; Utility Bill
              </h3>
              <StatusTag status={inv.payment_status} />
            </div>
            <p className="text-sm text-slate-600 tabular-nums">
              Room Rent {formatCurrency(inv.amount)} + Electricity Share{' '}
              {formatCurrency(inv.electricity_share)} + Other {formatCurrency(inv.other_charges)} ={' '}
              <span className="font-bold text-slate-900">{formatCurrency(inv.total_amount)}</span>
            </p>
            <p className="text-xs text-slate-500 font-mono">Invoice Ref: {inv.transaction_id}</p>
          </div>
          <button
            type="button"
            onClick={() => openPayModal(inv)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay Now (Demo)</span>
          </button>
        </div>
      ))}

      {/* Room Electricity Meter Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Room Electricity Meter Readings
            </h3>
            <p className="text-xs text-slate-500">
              Formula: Units Consumed = Current Reading − Previous Reading · Bill = Units × Rate/Unit
            </p>
          </div>
        </div>
        {bills.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Zap}
              title="No electricity readings yet"
              description="Your room electricity meter readings will appear here once recorded by the PG Manager."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Billing Month</th>
                  <th className="px-6 py-3">Room</th>
                  <th className="px-6 py-3 text-right">Previous Reading</th>
                  <th className="px-6 py-3 text-right">Current Reading</th>
                  <th className="px-6 py-3 text-right">Units Consumed</th>
                  <th className="px-6 py-3 text-right">Rate / Unit</th>
                  <th className="px-6 py-3 text-right">Total Room Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((b) => (
                  <tr key={b.bill_id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      {formatMonth(b.billing_month)}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-700">
                      Room {b.room_number}
                    </td>
                    <td className="px-6 py-3.5 text-right tabular-nums font-mono text-slate-600">
                      {b.previous_reading} kWh
                    </td>
                    <td className="px-6 py-3.5 text-right tabular-nums font-mono text-slate-900">
                      {b.current_reading} kWh
                    </td>
                    <td className="px-6 py-3.5 text-right tabular-nums font-semibold text-[#0F766E]">
                      {b.units_consumed} units
                    </td>
                    <td className="px-6 py-3.5 text-right tabular-nums text-slate-600">
                      {formatCurrency(b.rate_per_unit)}
                    </td>
                    <td className="px-6 py-3.5 text-right tabular-nums font-bold text-slate-900">
                      {formatCurrency(b.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rent Payment History Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Rent &amp; Payment History</h3>
          <p className="text-xs text-slate-500">
            Itemized monthly bills, demo transaction identifiers, and downloadable receipts
          </p>
        </div>
        {payments.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Receipt}
              title="No rent history found"
              description="Your monthly rent invoices and payment receipts will appear here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Month</th>
                  <th className="px-6 py-3">Transaction ID</th>
                  <th className="px-6 py-3 text-right">Room Rent</th>
                  <th className="px-6 py-3 text-right">Electricity</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3">Payment Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.payment_id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      {formatMonth(p.payment_month)}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-600">
                      {p.transaction_id}
                    </td>
                    <td className="px-6 py-3.5 text-right tabular-nums text-slate-700">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-6 py-3.5 text-right tabular-nums text-slate-700">
                      {formatCurrency(p.electricity_share)}
                    </td>
                    <td className="px-6 py-3.5 text-right tabular-nums font-bold text-slate-900">
                      {formatCurrency(p.total_amount)}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 text-xs">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusTag status={p.payment_status} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {p.payment_status === 'PAID' ? (
                        <button
                          type="button"
                          onClick={() => downloadReceiptHtml(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F294A] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openPayModal(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Now</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Demo Payment Workflow Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Demo Payment Confirmation
                </h3>
                <p className="text-xs text-slate-500">
                  Simulated payment gateway (no real funds charged)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!paymentResult ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Billing Cycle</span>
                    <span className="font-medium text-slate-900">
                      {formatMonth(payingInvoice.payment_month)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Room Rent</span>
                    <span className="tabular-nums">{formatCurrency(payingInvoice.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Electricity Share</span>
                    <span className="tabular-nums">
                      {formatCurrency(payingInvoice.electricity_share)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                    <span>Total Payable</span>
                    <span className="tabular-nums">{formatCurrency(payingInvoice.total_amount)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Demo Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="UPI (Demo)">UPI (Demo)</option>
                    <option value="Card (Demo)">Debit / Credit Card (Demo)</option>
                    <option value="NetBanking (Demo)">NetBanking (Demo)</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                    className="rounded border-slate-300 text-red-600"
                  />
                  <span>Simulate payment gateway decline (for testing failure state)</span>
                </label>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayingInvoice(null)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={handleConfirmPayment}
                    className="px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 rounded-lg"
                  >
                    {processing ? 'Processing...' : `Confirm ${formatCurrency(payingInvoice.total_amount)}`}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div
                  className={`rounded-xl border p-4 flex items-start gap-3 ${
                    paymentResult.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  {paymentResult.ok ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-sm">
                    <div className="font-semibold">
                      {paymentResult.ok ? 'Demo Payment Successful' : 'Demo Payment Declined'}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed">{paymentResult.message}</p>
                    {paymentResult.payment && (
                      <p className="mt-2 font-mono text-xs">
                        Transaction ID: {paymentResult.payment.transaction_id}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  {paymentResult.ok && paymentResult.payment && (
                    <button
                      type="button"
                      onClick={() => downloadReceiptHtml(paymentResult.payment!)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#0F294A] hover:bg-[#1E3A8A] rounded-lg"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Receipt</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPayingInvoice(null)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
