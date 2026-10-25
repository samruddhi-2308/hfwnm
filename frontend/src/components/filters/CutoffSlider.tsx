import React from 'react';
import { Clock, ShieldAlert } from 'lucide-react';

interface CutoffSliderProps {
  cutoffTime: string;
  onChange: (time: string) => void;
  disabled?: boolean;
}

// Available cutoff intervals between 06:00 and 14:00
const CUTOFF_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00',
];

const PRESETS = [
  { label: '07:00 Early Desk', value: '07:00' },
  { label: '09:00 Default', value: '09:00' },
  { label: '10:30 Nord Pool', value: '10:30' },
  { label: '11:00 EPEX Spot', value: '11:00' },
  { label: '12:00 Final Gate', value: '12:00' },
];

export const CutoffSlider: React.FC<CutoffSliderProps> = ({
  cutoffTime,
  onChange,
  disabled = false,
}) => {
  const currentIndex = Math.max(0, CUTOFF_OPTIONS.indexOf(cutoffTime));

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (idx >= 0 && idx < CUTOFF_OPTIONS.length) {
      onChange(CUTOFF_OPTIONS[idx]);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            D-1 Auction Gate Closure Cutoff
          </span>
          <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
            {cutoffTime} UK
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldAlert className="h-3.5 w-3.5 text-cyan-400" />
          <span>Strict zero look-ahead bias</span>
        </div>
      </div>

      <div className="mt-4">
        <input
          type="range"
          min={0}
          max={CUTOFF_OPTIONS.length - 1}
          value={currentIndex}
          onChange={handleSliderChange}
          disabled={disabled}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-amber-400 disabled:opacity-50"
        />
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span>06:00 UK</span>
          <span>09:00 (Desk Open)</span>
          <span>11:00 (Auction)</span>
          <span>14:00 UK</span>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const isActive = p.value === cutoffTime;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              disabled={disabled}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${
                isActive
                  ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_-2px_rgba(245,158,11,0.3)]'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
