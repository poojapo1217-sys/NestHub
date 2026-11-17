import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  tone?: 'navy' | 'teal' | 'amber' | 'red' | 'blue';
}

const TONE_MAP = {
  navy: 'bg-slate-100 text-[#0F294A]',
  blue: 'bg-blue-50 text-blue-700',
  teal: 'bg-teal-50 text-[#0F766E]',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
};

export function KpiCard({ title, value, subtitle, icon: Icon, tone = 'navy' }: KpiCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_2px_0_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${TONE_MAP[tone]}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
        {value}
      </div>
      {subtitle && (
        <p className="mt-1.5 text-xs text-slate-500 tabular-nums">{subtitle}</p>
      )}
    </div>
  );
}
