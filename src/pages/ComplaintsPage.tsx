import React, { useEffect, useState } from 'react';
import { MessageSquarePlus, MessageSquareWarning } from 'lucide-react';
import { EmptyState } from '../components/EmptyState.tsx';
import { LoadingState } from '../components/LoadingState.tsx';
import { StatusTag } from '../components/StatusTag.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest } from '../services/api.ts';
import type { Complaint } from '../types/index.ts';
import { formatDate } from '../utils/format.ts';

const CATEGORIES = [
  'Electricity',
  'Water',
  'Wi-Fi',
  'Cleaning',
  'Furniture',
  'Maintenance',
  'Other',
];

export function ComplaintsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [category, setCategory] = useState('Electricity');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roomNumber, setRoomNumber] = useState(user?.tenant_profile?.room_number || '');
  const [complaintDate, setComplaintDate] = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState('MEDIUM');

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ complaints: Complaint[] }>('/complaints');
      setComplaints(res.complaints);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadComplaints();
  }, []);

  useEffect(() => {
    if (user?.tenant_profile?.room_number && !roomNumber) {
      setRoomNumber(user.tenant_profile.room_number);
    }
  }, [user, roomNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Please enter a complaint title and description.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ message: string }>('/complaints', {
        method: 'POST',
        body: JSON.stringify({
          category,
          title: title.trim(),
          description: description.trim(),
          room_number: roomNumber.trim(),
          complaint_date: complaintDate,
          priority,
        }),
      });
      toast.success(res.message);
      setTitle('');
      setDescription('');
      void loadComplaints();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Registration Form */}
      <div className="lg:col-span-5">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <MessageSquarePlus className="w-5 h-5 text-[#0F294A]" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Register New Complaint</h2>
              <p className="text-xs text-slate-500">
                Generates a unique tracking ID and notifies the PG Manager
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Complaint Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Ceiling fan regulator not working"
                className="w-full h-10 px-3.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Room Number
                </label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. 101"
                  className="w-full h-10 px-3.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Complaint Date
                </label>
                <input
                  type="date"
                  value={complaintDate}
                  onChange={(e) => setComplaintDate(e.target.value)}
                  className="w-full h-10 px-3.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Description
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue clearly so maintenance staff can resolve it quickly..."
                className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 bg-[#0F294A] hover:bg-[#1E3A8A] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </form>
        </div>
      </div>

      {/* Right: Complaint History */}
      <div className="lg:col-span-7">
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">Your Complaint History</h3>
            <p className="text-xs text-slate-500">
              Track live status updates (Pending, In Progress, Resolved) and manager remarks
            </p>
          </div>

          {complaints.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={MessageSquareWarning}
                title="No complaints submitted"
                description="Everything looks good! Use the form on the left if you need maintenance assistance."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {complaints.map((c) => (
                <div key={c.complaint_id} className="p-5 hover:bg-slate-50/50 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-900">
                        {c.complaint_code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{c.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>Room {c.room_number || '—'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDate(c.complaint_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusTag status={c.priority} />
                      <StatusTag status={c.status} />
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">{c.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{c.description}</p>
                  {c.resolution_remarks && (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">Manager Remarks: </span>
                      {c.resolution_remarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
