import React from 'react';
import { Clock, ShieldCheck } from 'lucide-react';

interface CutoffSliderProps {
  cutoffTime: string;
  onChange: (time: string) => void;
  disabled?: boolean;
}

const CUTOFF_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00',
];

const PRESETS = [
  { label: '07:00 Early Desk', value: '07:00' },
  { label: '09:00 Operational Default', value: '09:00' },
  { label: '10:30 Nord Pool Auction', value: '10:30' },
  { label: '11:00 EPEX Spot Auction', value: '11:00' },
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
    <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-4 backdrop-blur-md shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
            D-1 Auction Gate Closure Cutoff
          </span>
          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20 tabular-nums">
            {cutoffTime} UK
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
          <span className="font-medium">Strict zero look-ahead bias</span>
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
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 disabled:opacity-50"
        />
        <div className="mt-1.5 flex justify-between text-[10px] text-slate-500 font-medium">
          <span>06:00 UK</span>
          <span>09:00 (Desk Kickoff)</span>
          <span>11:00 (Auction Close)</span>
          <span>14:00 UK</span>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const isActive = p.value === cutoffTime;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              disabled={disabled}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                isActive
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-sm font-semibold'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
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
