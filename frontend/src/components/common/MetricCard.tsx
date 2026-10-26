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

const variantConfig = {
  cyan: {
    accentBar: 'bg-sky-500',
    badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    iconClass: 'text-sky-400 bg-sky-500/10',
    valueClass: 'text-slate-100',
  },
  amber: {
    accentBar: 'bg-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    iconClass: 'text-amber-400 bg-amber-500/10',
    valueClass: 'text-slate-100',
  },
  emerald: {
    accentBar: 'bg-emerald-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    iconClass: 'text-emerald-400 bg-emerald-500/10',
    valueClass: 'text-slate-100',
  },
  rose: {
    accentBar: 'bg-rose-500',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    iconClass: 'text-rose-400 bg-rose-500/10',
    valueClass: 'text-slate-100',
  },
  indigo: {
    accentBar: 'bg-indigo-500',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    iconClass: 'text-indigo-400 bg-indigo-500/10',
    valueClass: 'text-slate-100',
  },
  slate: {
    accentBar: 'bg-slate-600',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    iconClass: 'text-slate-400 bg-slate-800',
    valueClass: 'text-slate-100',
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
  const config = variantConfig[variant];

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-800/90 bg-slate-900/60 p-4 backdrop-blur-md transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/80 shadow-sm">
      {/* Subtle top indicator bar */}
      <div className={`absolute inset-x-0 top-0 h-[2px] opacity-70 ${config.accentBar}`} />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon && (
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${config.iconClass}`}>
              {icon}
            </div>
          )}
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </span>
        </div>

        {badge && (
          <span
            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${config.badgeClass}`}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`tabular-nums text-2xl font-bold tracking-tight ${config.valueClass}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-semibold text-slate-400">{unit}</span>}
      </div>

      {subtitle && (
        <p className="mt-1 text-[11px] text-slate-400 font-medium truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
};
