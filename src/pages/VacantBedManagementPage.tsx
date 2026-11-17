import { useEffect, useState } from 'react';
import { BedDouble, CheckCircle2, DoorOpen, Percent, Search, Wrench, X } from 'lucide-react';
import { EmptyState } from '../components/EmptyState.tsx';
import { KpiCard } from '../components/KpiCard.tsx';
import { LoadingState } from '../components/LoadingState.tsx';
import { StatusTag } from '../components/StatusTag.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest } from '../services/api.ts';
import type { BedItem, RoomWithBeds } from '../types/index.ts';
import { formatCurrency, formatDate } from '../utils/format.ts';

interface BedsResponse {
  summary: {
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    vacantBeds: number;
    maintenanceBeds: number;
    occupancyPercentage: number;
  };
  rooms: RoomWithBeds[];
}

export function VacantBedManagementPage() {
  const toast = useToast();

  const [data, setData] = useState<BedsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomSearch, setRoomSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedBed, setSelectedBed] = useState<BedItem | null>(null);

  const loadBeds = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roomSearch.trim()) params.set('room', roomSearch.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await apiRequest<BedsResponse>(
        `/beds${params.toString() ? `?${params.toString()}` : ''}`
      );
      setData(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load bed inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBeds();
  }, [statusFilter]);

  const handleToggleBedStatus = async (bed: BedItem, nextStatus: 'VACANT' | 'MAINTENANCE') => {
    const ok = await toast.confirm({
      title: `Update ${bed.bed_number} to ${nextStatus}?`,
      message:
        nextStatus === 'MAINTENANCE'
          ? 'This bed will be blocked from new tenant allocations until returned to Vacant.'
          : 'This bed will become immediately available for new tenant registration.',
      confirmLabel: `Mark ${nextStatus}`,
    });
    if (!ok) return;
    try {
      const res = await apiRequest<{ message: string }>(`/beds/${bed.bed_id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      toast.success(res.message);
      setSelectedBed(null);
      void loadBeds();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update bed status.');
    }
  };

  if (loading || !data) return <LoadingState />;

  const { summary, rooms } = data;

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Total Beds" value={summary.totalBeds} icon={BedDouble} tone="navy" />
        <KpiCard title="Total Rooms" value={summary.totalRooms} icon={DoorOpen} tone="navy" />
        <KpiCard title="Occupied Beds" value={summary.occupiedBeds} icon={BedDouble} tone="blue" />
        <KpiCard title="Available (Vacant)" value={summary.vacantBeds} icon={CheckCircle2} tone="teal" />
        <KpiCard
          title="Maintenance Beds"
          value={summary.maintenanceBeds}
          icon={Wrench}
          tone="amber"
        />
        <KpiCard
          title="Occupancy Rate"
          value={`${summary.occupancyPercentage}%`}
          icon={Percent}
          tone="blue"
        />
      </div>

      {/* Filter & Legend Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void loadBeds();
              }}
              placeholder="Search room (e.g. 101)..."
              className="w-full h-10 pl-10 pr-20 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
            />
            <button
              type="button"
              onClick={() => void loadBeds()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold text-white bg-[#0F294A] rounded-md"
            >
              Filter
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {['ALL', 'VACANT', 'OCCUPIED', 'MAINTENANCE'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === s
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s === 'ALL' ? 'All Beds' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Explicit Color + Label Indicators */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
            <span>Green = Vacant</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-600 inline-block" />
            <span>Blue = Occupied</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
            <span>Orange = Maintenance</span>
          </span>
        </div>
      </div>

      {/* Room-Wise Bed Availability Matrix Cards */}
      {rooms.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title="No matching rooms or beds"
          description="Try clearing the room search or selecting All Beds."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rooms.map((room) => (
            <div
              key={room.room_id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Room {room.room_number}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Floor {room.floor} · {room.room_type}
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {room.beds.filter((b) => b.status === 'VACANT').length} / {room.total_beds} Vacant
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {room.beds.map((bed) => {
                  const styleClass =
                    bed.status === 'VACANT'
                      ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50'
                      : bed.status === 'OCCUPIED'
                        ? 'border-blue-300 bg-blue-50/50 hover:bg-blue-50'
                        : 'border-amber-300 bg-amber-50/60 hover:bg-amber-50';

                  return (
                    <button
                      key={bed.bed_id}
                      type="button"
                      onClick={() => setSelectedBed(bed)}
                      className={`text-left rounded-xl border p-3.5 transition-colors ${styleClass}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {bed.bed_number}
                        </span>
                        <StatusTag status={bed.status} />
                      </div>
                      <div className="mt-2 text-xs text-slate-700 truncate">
                        {bed.status === 'OCCUPIED' && bed.tenant_name
                          ? `${bed.tenant_name} (${bed.tenant_code})`
                          : bed.status === 'VACANT'
                            ? 'Available for allocation'
                            : 'Scheduled maintenance'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bed Inspection / Status Toggle Modal */}
      {selectedBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-mono">
                  {selectedBed.bed_number}
                </h3>
                <p className="text-xs text-slate-500">
                  Room {selectedBed.room_number} · Floor {selectedBed.floor} · {selectedBed.room_type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBed(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Current Bed Status</span>
                <StatusTag status={selectedBed.status} />
              </div>

              {selectedBed.status === 'OCCUPIED' ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Resident</span>
                    <span className="font-semibold text-slate-900">
                      {selectedBed.tenant_name} ({selectedBed.tenant_code})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone</span>
                    <span className="tabular-nums">{selectedBed.tenant_phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Monthly Rent</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(selectedBed.monthly_rent)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Joined</span>
                    <span>{formatDate(selectedBed.joining_date)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 pt-2">
                  {selectedBed.status !== 'MAINTENANCE' && (
                    <button
                      type="button"
                      onClick={() => void handleToggleBedStatus(selectedBed, 'MAINTENANCE')}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg"
                    >
                      Mark Maintenance
                    </button>
                  )}
                  {selectedBed.status !== 'VACANT' && (
                    <button
                      type="button"
                      onClick={() => void handleToggleBedStatus(selectedBed, 'VACANT')}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[#0F766E] hover:bg-teal-800 rounded-lg"
                    >
                      Mark Vacant
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
