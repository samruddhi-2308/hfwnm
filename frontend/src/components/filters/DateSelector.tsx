import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, Wind } from 'lucide-react';

interface DateSelectorProps {
  selectedDate: string;
  onChange: (date: string) => void;
  disabled?: boolean;
}

const PRESET_DATES = [
  { label: 'Jan 15 (High Wind)', date: '2026-01-15' },
  { label: 'Jan 19 (Calm Anti-cyclone)', date: '2026-01-19' },
  { label: 'Jan 21 (Storm Isha Surge)', date: '2026-01-21' },
  { label: 'Jan 24 (High Ramp)', date: '2026-01-24' },
];

export const DateSelector: React.FC<DateSelectorProps> = ({
  selectedDate,
  onChange,
  disabled = false,
}) => {
  const currentDay = parseInt(selectedDate.split('-')[2] || '1', 10);

  const handlePrevDay = () => {
    if (currentDay > 1) {
      const prevDayStr = String(currentDay - 1).padStart(2, '0');
      onChange(`2026-01-${prevDayStr}`);
    }
  };

  const handleNextDay = () => {
    if (currentDay < 31) {
      const nextDayStr = String(currentDay + 1).padStart(2, '0');
      onChange(`2026-01-${nextDayStr}`);
    }
  };

  const dateObj = new Date(`${selectedDate}T00:00:00Z`);
  const formattedLong = dateObj.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-4 backdrop-blur-md shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
            Delivery Day
          </span>
          <span className="text-xs text-slate-400 font-medium">({formattedLong})</span>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevDay}
            disabled={disabled || currentDay <= 1}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/60 text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 disabled:opacity-30"
            title="Previous Day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <input
            type="date"
            min="2026-01-01"
            max="2026-01-31"
            value={selectedDate}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            disabled={disabled}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-100 focus:border-sky-500 focus:outline-none tabular-nums"
          />

          <button
            type="button"
            onClick={handleNextDay}
            disabled={disabled || currentDay >= 31}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/60 text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 disabled:opacity-30"
            title="Next Day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quick Event Presets */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESET_DATES.map((p) => {
          const isActive = p.date === selectedDate;
          return (
            <button
              key={p.date}
              type="button"
              onClick={() => onChange(p.date)}
              disabled={disabled}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                isActive
                  ? 'border-sky-500/40 bg-sky-500/15 text-sky-300 shadow-sm font-semibold'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <Wind className="h-3 w-3 text-sky-400" />
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
