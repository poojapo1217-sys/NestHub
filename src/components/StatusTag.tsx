import { AlertCircle, CheckCircle2, Clock, Wrench, XCircle } from 'lucide-react';

interface StatusTagProps {
  status: string;
}

const CONFIG: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  PAID: {
    label: 'Paid',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  OCCUPIED: {
    label: 'Occupied',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: CheckCircle2,
  },
  VACANT: {
    label: 'Vacant',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  ACTIVE: {
    label: 'Active',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  RESOLVED: {
    label: 'Resolved',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  HELD: {
    label: 'Held',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: Clock,
  },
  REFUNDED: {
    label: 'Refunded',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  PARTIAL_REFUND: {
    label: 'Partial Refund',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: AlertCircle,
  },
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Clock,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: Wrench,
  },
  MAINTENANCE: {
    label: 'Maintenance',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Wrench,
  },
  CHECKED_OUT: {
    label: 'Checked Out',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Clock,
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-50 text-red-800 border-red-200',
    icon: XCircle,
  },
  HIGH: {
    label: 'High',
    className: 'bg-red-50 text-red-800 border-red-200',
    icon: AlertCircle,
  },
  MEDIUM: {
    label: 'Medium',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Clock,
  },
  LOW: {
    label: 'Low',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: CheckCircle2,
  },
};

export function StatusTag({ status }: StatusTagProps) {
  const key = status.toUpperCase();
  const cfg = CONFIG[key] || {
    label: status,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Clock,
  };
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${cfg.className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{cfg.label}</span>
    </span>
  );
}
