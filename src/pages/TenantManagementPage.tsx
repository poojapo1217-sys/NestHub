import React, { useEffect, useState } from 'react';
import {
  Edit3,
  Eye,
  FileUp,
  LogOut,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState.tsx';
import { LoadingState } from '../components/LoadingState.tsx';
import { StatusTag } from '../components/StatusTag.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest, getStoredToken } from '../services/api.ts';
import type { BedItem, DepositRecord, RentPayment, TenantProfile } from '../types/index.ts';
import { formatCurrency, formatDate, formatMonth } from '../utils/format.ts';

interface TenantDetailResponse {
  tenant: TenantProfile;
  stays: Array<{
    stay_id: number;
    bed_number: string;
    room_number: string;
    check_in: string;
    check_out: string | null;
  }>;
  payments: RentPayment[];
  deposits: DepositRecord[];
  documents: Array<{
    document_id: number;
    document_type: string;
    file_name: string;
    uploaded_date: string;
  }>;
}

export function TenantManagementPage() {
  const toast = useToast();

  const [tenants, setTenants] = useState<TenantProfile[]>([]);
  const [vacantBeds, setVacantBeds] = useState<BedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  // Registration Form State
  const [showRegister, setShowRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedBedId, setSelectedBedId] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [monthlyRent, setMonthlyRent] = useState('8500');
  const [securityDeposit, setSecurityDeposit] = useState('15000');
  const [address, setAddress] = useState('');
  const [documentType, setDocumentType] = useState('Aadhaar / Govt ID');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Detail Drawer / Edit Modal / Checkout Modal
  const [detailData, setDetailData] = useState<TenantDetailResponse | null>(null);
  const [editingTenant, setEditingTenant] = useState<TenantProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [editRent, setEditRent] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const [checkoutTenant, setCheckoutTenant] = useState<TenantProfile | null>(null);
  const [checkoutDate, setCheckoutDate] = useState(new Date().toISOString().slice(0, 10));
  const [refundAmount, setRefundAmount] = useState('0');

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const [tRes, bRes] = await Promise.all([
        apiRequest<{ tenants: TenantProfile[] }>(
          `/tenants${params.toString() ? `?${params.toString()}` : ''}`
        ),
        apiRequest<{ vacant_beds: BedItem[] }>('/beds/vacant'),
      ]);
      setTenants(tRes.tenants);
      setVacantBeds(bRes.vacant_beds);
      if (bRes.vacant_beds.length > 0 && !selectedBedId) {
        setSelectedRoom(bRes.vacant_beds[0].room_number);
        setSelectedBedId(String(bRes.vacant_beds[0].bed_id));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tenant records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [statusFilter]);

  const roomsWithVacant = Array.from(new Set(vacantBeds.map((b) => b.room_number)));
  const bedsForSelectedRoom = vacantBeds.filter(
    (b) => !selectedRoom || b.room_number === selectedRoom
  );

  const handleRoomChange = (roomNum: string) => {
    setSelectedRoom(roomNum);
    const firstBed = vacantBeds.find((b) => b.room_number === roomNum);
    setSelectedBedId(firstBed ? String(firstBed.bed_id) : '');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBedId) {
      toast.error('No vacant bed selected.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('email', email.trim());
      formData.append('phone', phone.trim());
      formData.append('emergency_contact', emergencyContact.trim());
      formData.append('bed_id', selectedBedId);
      formData.append('joining_date', joiningDate);
      formData.append('monthly_rent', monthlyRent);
      formData.append('security_deposit', securityDeposit);
      formData.append('address', address.trim());
      formData.append('document_type', documentType);
      if (docFile) {
        formData.append('document', docFile);
      }

      const res = await apiRequest<{ message: string; tenant: { tenant_code: string; initial_password: string } }>(
        '/tenants',
        {
          method: 'POST',
          body: formData,
        }
      );

      toast.success(
        `${res.message} Portal ID: ${res.tenant.tenant_code} (Temp Password: ${res.tenant.initial_password})`
      );
      setShowRegister(false);
      setName('');
      setEmail('');
      setPhone('');
      setEmergencyContact('');
      setAddress('');
      setDocFile(null);
      setSelectedBedId('');
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register tenant.');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetails = async (tenantId: number) => {
    try {
      const res = await apiRequest<TenantDetailResponse>(`/tenants/${tenantId}`);
      setDetailData(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tenant profile.');
    }
  };

  const openEdit = (t: TenantProfile) => {
    setEditingTenant(t);
    setEditName(t.name);
    setEditPhone(t.phone);
    setEditEmergency(t.emergency_contact);
    setEditRent(String(t.monthly_rent));
    setEditAddress(t.address || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    try {
      const res = await apiRequest<{ message: string }>(`/tenants/${editingTenant.tenant_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          emergency_contact: editEmergency.trim(),
          monthly_rent: Number(editRent),
          address: editAddress.trim(),
        }),
      });
      toast.success(res.message);
      setEditingTenant(null);
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const openCheckout = (t: TenantProfile) => {
    setCheckoutTenant(t);
    setCheckoutDate(new Date().toISOString().slice(0, 10));
    setRefundAmount(String(t.deposit_amount || 0));
  };

  const handleConfirmCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutTenant) return;
    try {
      const res = await apiRequest<{ message: string }>(`/tenants/${checkoutTenant.tenant_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          action: 'CHECKOUT',
          check_out_date: checkoutDate,
          refund_amount: Number(refundAmount),
        }),
      });
      toast.success(res.message);
      setCheckoutTenant(null);
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void loadData();
              }}
              placeholder="Search name, ID, room, or phone..."
              className="w-full h-10 pl-10 pr-20 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
            />
            <button
              type="button"
              onClick={() => void loadData()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold text-white bg-[#0F294A] rounded-md"
            >
              Search
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {['ACTIVE', 'CHECKED_OUT', 'ALL'].map((s) => (
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
                {s === 'ACTIVE' ? 'Active' : s === 'CHECKED_OUT' ? 'Checked Out' : 'All'}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowRegister((prev) => !prev)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F294A] hover:bg-[#1E3A8A] rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>{showRegister ? 'Close Form' : 'New Tenant Registration'}</span>
        </button>
      </div>

      {/* Registration Form Panel */}
      {showRegister && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                New Tenant Registration &amp; Bed Allocation
              </h2>
              <p className="text-xs text-slate-500">
                Creates resident portal credentials, assigns a vacant bed, records security deposit, and locks bed status to Occupied
              </p>
            </div>
            <span className="text-xs font-medium text-[#0F766E]">
              {vacantBeds.length} Vacant Beds Available
            </span>
          </div>

          <form onSubmit={handleRegister} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tenant Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arjun Deshpande"
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="arjun@example.com"
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9845099001"
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emergency Contact *
                </label>
                <input
                  type="text"
                  required
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="9811199001"
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Room Number *
                </label>
                <select
                  value={selectedRoom}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
                >
                  {roomsWithVacant.map((rm) => (
                    <option key={rm} value={rm}>
                      Room {rm}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Available Bed *
                </label>
                <select
                  required
                  value={selectedBedId}
                  onChange={(e) => setSelectedBedId(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg font-mono"
                >
                  {bedsForSelectedRoom.map((b) => (
                    <option key={b.bed_id} value={b.bed_id}>
                      {b.bed_number} (Vacant)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Joining Date *
                </label>
                <input
                  type="date"
                  required
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monthly Rent (₹) *
                </label>
                <input
                  type="number"
                  min={1000}
                  required
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  className="w-full h-10 px-3 text-sm tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Security Deposit (₹) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(e.target.value)}
                  className="w-full h-10 px-3 text-sm tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Permanent Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="City, State"
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Identity Document Type (Optional)
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
                >
                  <option value="Aadhaar / Govt ID">Aadhaar / Govt ID</option>
                  <option value="College ID Card">College ID Card</option>
                  <option value="Passport">Passport</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload ID Proof (PDF/JPG/PNG, max 5 MB)
                </label>
                <label className="flex items-center gap-2 h-10 px-3 border border-dashed border-slate-300 rounded-lg text-xs text-slate-600 cursor-pointer hover:bg-slate-50">
                  <FileUp className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {docFile ? docFile.name : 'Choose secure document file...'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || vacantBeds.length === 0}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0F294A] hover:bg-[#1E3A8A] rounded-lg disabled:opacity-50"
              >
                {submitting ? 'Registering...' : 'Complete Registration & Assign Bed'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tenant Directory Table */}
      {loading ? (
        <LoadingState />
      ) : tenants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No tenants found"
          description="Adjust your search or status filter, or register a new resident."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Tenant ID</th>
                  <th className="px-5 py-3">Resident</th>
                  <th className="px-5 py-3">Room &amp; Bed</th>
                  <th className="px-5 py-3">Joining Date</th>
                  <th className="px-5 py-3 text-right">Monthly Rent</th>
                  <th className="px-5 py-3 text-right">Deposit</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((t) => (
                  <tr key={t.tenant_id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-900">
                      {t.tenant_code}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{t.name}</div>
                      <div className="text-xs text-slate-500">
                        {t.phone} · {t.email}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {t.room_number ? `Rm ${t.room_number} · ${t.bed_number}` : 'Unassigned'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {formatDate(t.joining_date)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-slate-900">
                      {formatCurrency(t.monthly_rent)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">
                      {formatCurrency(t.deposit_amount || 0)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <StatusTag status={t.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void openDetails(t.tenant_id)}
                          className="p-1.5 text-slate-600 hover:text-[#2563EB] rounded-md hover:bg-slate-100"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="p-1.5 text-slate-600 hover:text-[#0F294A] rounded-md hover:bg-slate-100"
                          title="Edit Tenant"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {t.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => openCheckout(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Check Out</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Tenant Details Modal */}
      {detailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {detailData.tenant.name} ({detailData.tenant.tenant_code})
                </h3>
                <p className="text-xs text-slate-500">
                  {detailData.tenant.email} · {detailData.tenant.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailData(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-5 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-xs text-slate-500">Monthly Rent</div>
                  <div className="font-bold tabular-nums">{formatCurrency(detailData.tenant.monthly_rent)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Emergency Contact</div>
                  <div className="font-semibold tabular-nums">{detailData.tenant.emergency_contact}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Address</div>
                  <div className="font-medium">{detailData.tenant.address || '—'}</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Stay History</h4>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {detailData.stays.map((s) => (
                    <div key={s.stay_id} className="px-3.5 py-2.5 flex justify-between text-xs">
                      <span className="font-mono font-medium">
                        Room {s.room_number} · {s.bed_number}
                      </span>
                      <span className="text-slate-600">
                        {formatDate(s.check_in)} → {s.check_out ? formatDate(s.check_out) : 'Present'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Recent Payments</h4>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {detailData.payments.slice(0, 5).map((p) => (
                    <div key={p.payment_id} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                      <span>
                        {formatMonth(p.payment_month)} · <span className="font-mono">{p.transaction_id}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(Number(p.amount) + Number(p.electricity_share || 0))}
                        </span>
                        <StatusTag status={p.payment_status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {detailData.documents.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">Protected Identity Documents</h4>
                  <div className="space-y-1.5">
                    {detailData.documents.map((doc) => (
                      <div
                        key={doc.document_id}
                        className="flex items-center justify-between px-3.5 py-2 border border-slate-200 rounded-lg text-xs"
                      >
                        <span>
                          {doc.document_type}: <strong>{doc.file_name}</strong>
                        </span>
                        <a
                          href={`/api/tenants/${detailData.tenant.tenant_id}/documents/${doc.document_id}?token=${encodeURIComponent(getStoredToken() || '')}`}
                          className="text-[#2563EB] font-semibold hover:underline"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">
                Edit Tenant · {editingTenant.tenant_code}
              </h3>
              <button type="button" onClick={() => setEditingTenant(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency</label>
                  <input
                    type="text"
                    required
                    value={editEmergency}
                    onChange={(e) => setEditEmergency(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Rent (₹)</label>
                <input
                  type="number"
                  min={1000}
                  required
                  value={editRent}
                  onChange={(e) => setEditRent(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0F294A] rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Tenant Modal */}
      {checkoutTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">
                Check Out · {checkoutTenant.name}
              </h3>
              <button type="button" onClick={() => setCheckoutTenant(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              Checking out releases bed <strong className="font-mono">{checkoutTenant.bed_number}</strong> back to
              Vacant status while preserving all historical rent payments and deposit records.
            </p>
            <form onSubmit={handleConfirmCheckout} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Check-out Date</label>
                <input
                  type="date"
                  required
                  value={checkoutDate}
                  onChange={(e) => setCheckoutDate(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Security Deposit Refund (Held: {formatCurrency(checkoutTenant.deposit_amount || 0)})
                </label>
                <input
                  type="number"
                  min={0}
                  max={Number(checkoutTenant.deposit_amount || 0)}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full h-9 px-3 text-sm tabular-nums border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutTenant(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
                >
                  Confirm Check Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
