import React, { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, Search, X } from 'lucide-react';
import { EmptyState } from '../components/EmptyState.tsx';
import { LoadingState } from '../components/LoadingState.tsx';
import { StatusTag } from '../components/StatusTag.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest } from '../services/api.ts';
import type { Complaint } from '../types/index.ts';
import { formatDate } from '../utils/format.ts';

export function ComplaintManagementPage() {
  const toast = useToast();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [editing, setEditing] = useState<Complaint | null>(null);
  const [statusDraft, setStatusDraft] = useState('IN_PROGRESS');
  const [priorityDraft, setPriorityDraft] = useState('MEDIUM');
  const [remarksDraft, setRemarksDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await apiRequest<{ complaints: Complaint[] }>(
        `/complaints${params.toString() ? `?${params.toString()}` : ''}`
      );
      setComplaints(res.complaints);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadComplaints();
  }, [statusFilter]);

  const openManageModal = (c: Complaint) => {
    setEditing(c);
    setStatusDraft(c.status);
    setPriorityDraft(c.priority);
    setRemarksDraft(c.resolution_remarks || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const res = await apiRequest<{ message: string }>(`/complaints/${editing.complaint_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: statusDraft,
          priority: priorityDraft,
          resolution_remarks: remarksDraft.trim(),
        }),
      });
      toast.success(res.message);
      setEditing(null);
      void loadComplaints();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update complaint.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickResolve = async (c: Complaint) => {
    const ok = await toast.confirm({
      title: `Mark ${c.complaint_code} as Resolved?`,
      message: `Confirm that "${c.title}" in Room ${c.room_number || '—'} has been resolved.`,
      confirmLabel: 'Mark Resolved',
    });
    if (!ok) return;
    try {
      const res = await apiRequest<{ message: string }>(`/complaints/${c.complaint_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'RESOLVED',
          resolution_remarks: c.resolution_remarks || 'Resolved by PG Management.',
        }),
      });
      toast.success(res.message);
      void loadComplaints();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to resolve complaint.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Status Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void loadComplaints();
            }}
            placeholder="Search by ID, tenant, room, or issue..."
            className="w-full h-10 pl-10 pr-20 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
          />
          <button
            type="button"
            onClick={() => void loadComplaints()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold text-white bg-[#0F294A] rounded-md"
          >
            Search
          </button>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
          {['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'].map((s) => (
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
              {s === 'ALL' ? 'All' : s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState />
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No matching complaints"
          description="Try clearing the search query or switching the status filter."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Complaint ID</th>
                  <th className="px-5 py-3">Tenant</th>
                  <th className="px-5 py-3">Room</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Issue &amp; Remarks</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <tr key={c.complaint_id} className="hover:bg-slate-50/70 align-top">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {c.complaint_code}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{c.tenant_name}</div>
                      <div className="text-xs text-slate-500">{c.tenant_phone}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700 whitespace-nowrap">
                      Room {c.room_number || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap">{c.category}</td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="font-medium text-slate-900">{c.title}</div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{c.description}</p>
                      {c.resolution_remarks && (
                        <p className="text-xs text-[#0F766E] mt-1">
                          Remark: {c.resolution_remarks}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {formatDate(c.complaint_date)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <StatusTag status={c.priority} />
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <StatusTag status={c.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openManageModal(c)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                        >
                          Update
                        </button>
                        {c.status !== 'RESOLVED' && (
                          <button
                            type="button"
                            onClick={() => handleQuickResolve(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#0F766E] hover:bg-teal-800 rounded-lg"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Resolve</span>
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

      {/* Update Status & Remarks Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Update Complaint · {editing.complaint_code}
                </h3>
                <p className="text-xs text-slate-500">
                  {editing.tenant_name} · Room {editing.room_number || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={priorityDraft}
                    onChange={(e) => setPriorityDraft(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution Remarks
                </label>
                <textarea
                  rows={3}
                  value={remarksDraft}
                  onChange={(e) => setRemarksDraft(e.target.value)}
                  placeholder="Enter technician notes or resolution details..."
                  className="w-full p-3 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0F294A] hover:bg-[#1E3A8A] rounded-lg"
                >
                  {saving ? 'Saving...' : 'Save Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
