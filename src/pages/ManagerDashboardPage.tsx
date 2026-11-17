import React, { useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  DoorOpen,
  Edit3,
  MessageSquareWarning,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState.tsx';
import { KpiCard } from '../components/KpiCard.tsx';
import { LoadingState } from '../components/LoadingState.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest } from '../services/api.ts';
import type { ElectricityBill, RoomWithBeds } from '../types/index.ts';
import { formatCurrency, formatMonth, getCurrentBillingMonth } from '../utils/format.ts';

interface ManagerDashboardResponse {
  stats: {
    totalTenants: number;
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    vacantBeds: number;
    maintenanceBeds: number;
    occupancyPercentage: number;
    pendingComplaints: number;
  };
  recentReadings: ElectricityBill[];
}

export function ManagerDashboardPage() {
  const toast = useToast();

  const [stats, setStats] = useState<ManagerDashboardResponse['stats'] | null>(null);
  const [rooms, setRooms] = useState<RoomWithBeds[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [loading, setLoading] = useState(true);

  // Electricity Meter Form
  const [roomId, setRoomId] = useState<string>('');
  const [billingMonth, setBillingMonth] = useState<string>(getCurrentBillingMonth());
  const [prevReading, setPrevReading] = useState<string>('1200');
  const [currReading, setCurrReading] = useState<string>('1350');
  const [ratePerUnit, setRatePerUnit] = useState<string>('8');
  const [submitting, setSubmitting] = useState(false);

  // Authorized Correction Modal
  const [correctingBill, setCorrectingBill] = useState<ElectricityBill | null>(null);
  const [corrPrev, setCorrPrev] = useState('');
  const [corrCurr, setCorrCurr] = useState('');
  const [corrRate, setCorrRate] = useState('');
  const [corrReason, setCorrReason] = useState('');
  const [savingCorr, setSavingCorr] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [dashRes, bedsRes, elecRes] = await Promise.all([
        apiRequest<ManagerDashboardResponse>('/dashboard/manager'),
        apiRequest<{ rooms: RoomWithBeds[] }>('/beds'),
        apiRequest<{ bills: ElectricityBill[] }>('/electricity'),
      ]);
      setStats(dashRes.stats);
      setRooms(bedsRes.rooms);
      setBills(elecRes.bills);
      if (!roomId && bedsRes.rooms.length > 0) {
        const defaultRoom = bedsRes.rooms[bedsRes.rooms.length - 1];
        setRoomId(String(defaultRoom.room_id));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load manager dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  // Auto-fill previous reading from latest recorded bill for selected room
  useEffect(() => {
    if (!roomId || bills.length === 0) return;
    const roomBills = bills
      .filter((b) => String(b.room_id) === roomId)
      .sort((a, b) => b.billing_month.localeCompare(a.billing_month));
    if (roomBills.length > 0) {
      const latest = roomBills[0];
      setPrevReading(String(latest.current_reading));
      setCurrReading(String(Number(latest.current_reading) + 120));
    }
  }, [roomId, bills]);

  const calc = useMemo(() => {
    const prev = Number(prevReading);
    const curr = Number(currReading);
    const rate = Number(ratePerUnit);
    if (!Number.isFinite(prev) || !Number.isFinite(curr) || !Number.isFinite(rate)) {
      return { valid: false, units: 0, total: 0 };
    }
    if (curr < prev || rate <= 0) {
      return { valid: false, units: curr - prev, total: 0 };
    }
    const units = curr - prev;
    return { valid: true, units, total: units * rate };
  }, [prevReading, currReading, ratePerUnit]);

  const handleMeterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) {
      toast.error('Please select a room.');
      return;
    }
    if (Number(currReading) < Number(prevReading)) {
      toast.error('Current reading cannot be less than previous reading.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ message: string }>('/electricity', {
        method: 'POST',
        body: JSON.stringify({
          room_id: Number(roomId),
          billing_month: billingMonth,
          previous_reading: Number(prevReading),
          current_reading: Number(currReading),
          rate_per_unit: Number(ratePerUnit),
        }),
      });
      toast.success(res.message);
      void loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save electricity reading.');
    } finally {
      setSubmitting(false);
    }
  };

  const openCorrectionModal = (bill: ElectricityBill) => {
    setCorrectingBill(bill);
    setCorrPrev(String(bill.previous_reading));
    setCorrCurr(String(bill.current_reading));
    setCorrRate(String(bill.rate_per_unit));
    setCorrReason('');
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingBill) return;
    if (!corrReason.trim()) {
      toast.error('Audit reason is mandatory for meter corrections.');
      return;
    }
    if (Number(corrCurr) < Number(corrPrev)) {
      toast.error('Current reading cannot be less than previous reading.');
      return;
    }
    setSavingCorr(true);
    try {
      const res = await apiRequest<{ message: string }>(`/electricity/${correctingBill.bill_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          previous_reading: Number(corrPrev),
          current_reading: Number(corrCurr),
          rate_per_unit: Number(corrRate),
          correction_reason: corrReason.trim(),
        }),
      });
      toast.success(res.message);
      setCorrectingBill(null);
      void loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Correction failed.');
    } finally {
      setSavingCorr(false);
    }
  };

  if (loading || !stats) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* KPI Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Active Tenants" value={stats.totalTenants} icon={Users} tone="navy" />
        <KpiCard title="Total Rooms" value={stats.totalRooms} icon={DoorOpen} tone="blue" />
        <KpiCard title="Total Beds" value={stats.totalBeds} icon={BedDouble} tone="navy" />
        <KpiCard
          title="Occupied Beds"
          value={stats.occupiedBeds}
          subtitle={`${stats.occupancyPercentage}% occupancy`}
          icon={BedDouble}
          tone="blue"
        />
        <KpiCard title="Vacant Beds" value={stats.vacantBeds} icon={BedDouble} tone="teal" />
        <KpiCard
          title="Pending Complaints"
          value={stats.pendingComplaints}
          icon={MessageSquareWarning}
          tone={stats.pendingComplaints > 0 ? 'amber' : 'teal'}
        />
      </div>

      {/* Electricity Meter Entry + Previous Readings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Meter Entry Form */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <Zap className="w-5 h-5 text-[#0F766E]" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Electricity Meter Reading Entry
                </h2>
                <p className="text-xs text-slate-500">
                  Prevents duplicate monthly room billing &amp; negative readings
                </p>
              </div>
            </div>

            <form onSubmit={handleMeterSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Room Number
                  </label>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                  >
                    {rooms.map((r) => (
                      <option key={r.room_id} value={r.room_id}>
                        Room {r.room_number} ({r.room_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Billing Month
                  </label>
                  <input
                    type="month"
                    required
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Previous Reading
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={prevReading}
                    onChange={(e) => setPrevReading(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Current Reading
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={currReading}
                    onChange={(e) => setCurrReading(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Rate / Unit (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    required
                    value={ratePerUnit}
                    onChange={(e) => setRatePerUnit(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Automatic Live Calculation Preview */}
              <div
                className={`rounded-xl border p-4 ${
                  calc.valid
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {calc.valid ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-500">Units Consumed</div>
                      <div className="text-xl font-bold text-[#0F766E] tabular-nums mt-0.5">
                        {calc.units} kWh
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Total Electricity Bill</div>
                      <div className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                        {formatCurrency(calc.total)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-medium">
                    Invalid reading: Current reading must be greater than or equal to previous reading.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || !calc.valid}
                className="w-full h-10 bg-[#0F294A] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {submitting ? 'Saving Reading...' : 'Record Electricity Bill'}
              </button>
            </form>
          </div>
        </div>

        {/* Previous Readings Table */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">
                Room-Wise Meter Reading History
              </h3>
              <p className="text-xs text-slate-500">
                Click Correct to perform an audit-logged adjustment on an existing reading
              </p>
            </div>

            {bills.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Zap}
                  title="No meter readings recorded"
                  description="Use the form on the left to record the first room electricity reading."
                />
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[540px]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Month</th>
                      <th className="px-4 py-3">Room</th>
                      <th className="px-4 py-3 text-right">Prev</th>
                      <th className="px-4 py-3 text-right">Curr</th>
                      <th className="px-4 py-3 text-right">Units</th>
                      <th className="px-4 py-3 text-right">Bill</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bills.map((b) => (
                      <tr key={b.bill_id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                          {formatMonth(b.billing_month)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">
                          Rm {b.room_number}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">
                          {b.previous_reading}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                          {b.current_reading}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[#0F766E] font-semibold">
                          {b.units_consumed}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900">
                          {formatCurrency(b.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openCorrectionModal(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Correct</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Authorized Correction Modal */}
      {correctingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Authorized Meter Correction · Room {correctingBill.room_number}
                </h3>
                <p className="text-xs text-slate-500">
                  {formatMonth(correctingBill.billing_month)} · Logged to Audit Trail
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCorrectingBill(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCorrection} className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prev</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={corrPrev}
                    onChange={(e) => setCorrPrev(e.target.value)}
                    className="w-full h-9 px-2.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Curr</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={corrCurr}
                    onChange={(e) => setCorrCurr(e.target.value)}
                    className="w-full h-9 px-2.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    required
                    value={corrRate}
                    onChange={(e) => setCorrRate(e.target.value)}
                    className="w-full h-9 px-2.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Audit Reason
                </label>
                <textarea
                  rows={2}
                  required
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  placeholder="e.g. Sub-meter digit misread during manual inspection"
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCorrectingBill(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCorr}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0F294A] hover:bg-[#1E3A8A] rounded-lg"
                >
                  {savingCorr ? 'Updating...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
