import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  badge?: string;
  variant?: 'cyan' | 'amber' | 'emerald' | 'rose' | 'indigo' | 'slate';
  icon?: React.ReactNode;
}

const variantStyles = {
  cyan: {
    border: 'border-cyan-500/20 hover:border-cyan-500/40',
    glow: 'group-hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.25)]',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    val: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10 text-cyan-400',
  },
  amber: {
    border: 'border-amber-500/20 hover:border-amber-500/40',
    glow: 'group-hover:shadow-[0_0_20px_-5px_rgba(245,158,11,0.25)]',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    val: 'text-amber-400',
    iconBg: 'bg-amber-500/10 text-amber-400',
  },
  emerald: {
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    glow: 'group-hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.25)]',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    val: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 text-emerald-400',
  },
  rose: {
    border: 'border-rose-500/20 hover:border-rose-500/40',
    glow: 'group-hover:shadow-[0_0_20px_-5px_rgba(244,63,94,0.25)]',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    val: 'text-rose-400',
    iconBg: 'bg-rose-500/10 text-rose-400',
  },
  indigo: {
    border: 'border-indigo-500/20 hover:border-indigo-500/40',
    glow: 'group-hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.25)]',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    val: 'text-indigo-400',
    iconBg: 'bg-indigo-500/10 text-indigo-400',
  },
  slate: {
    border: 'border-slate-800 hover:border-slate-700',
    glow: 'group-hover:shadow-[0_0_20px_-5px_rgba(148,163,184,0.15)]',
    badge: 'bg-slate-800 text-slate-400 border-slate-700',
    val: 'text-slate-100',
    iconBg: 'bg-slate-800 text-slate-400',
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  badge,
  variant = 'slate',
  icon,
}) => {
  const style = variantStyles[variant];

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-slate-900/70 p-4 backdrop-blur-md transition-all duration-200 ${style.border} ${style.glow}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon && (
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${style.iconBg}`}>
              {icon}
            </div>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </span>
        </div>
        {badge && (
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${style.badge}`}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`tabular-nums text-2xl font-bold tracking-tight ${style.val}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  );
};
