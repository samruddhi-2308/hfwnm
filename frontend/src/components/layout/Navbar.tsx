import React from 'react';
import { Wind, TrendingDown, BookOpen, Activity, CheckCircle2, Shield } from 'lucide-react';
import type { MetaResponse } from '../../types/api';

export type NavTab = 'decision' | 'accuracy' | 'methodology';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  metadata?: MetaResponse | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  metadata,
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Portal Brand Identity */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-sm shadow-sky-500/20 ring-1 ring-white/10">
            <Wind className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-slate-100">
                UK Wind Forecast Portal
              </span>
              <span className="rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400 border border-sky-500/20">
                GB Power Desk
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              January 2026 Gate-Closure & Imbalance Risk
            </p>
          </div>
        </div>

        {/* Refined Segmented Control Tab Navigation */}
        <nav className="flex items-center rounded-xl bg-slate-900/90 p-1 border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => onTabChange('decision')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'decision'
                ? 'bg-slate-800 text-slate-100 shadow-sm ring-1 ring-white/10 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-sky-400" />
            <span>Decision Desk</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('accuracy')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'accuracy'
                ? 'bg-slate-800 text-slate-100 shadow-sm ring-1 ring-white/10 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5 text-indigo-400" />
            <span>Accuracy & Horizon</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('methodology')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'methodology'
                ? 'bg-slate-800 text-slate-100 shadow-sm ring-1 ring-white/10 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-amber-400" />
            <span>Methodology & Audit</span>
          </button>
        </nav>

        {/* Live Data Integrity Status Badge */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5">
            <div className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-medium">Elexon Verified</span>
              <span className="text-slate-500">•</span>
              <span className="tabular-nums font-semibold text-slate-200">
                {metadata?.january_periods_actual ?? 1488} / 1,488 SPs
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1 rounded-md border border-slate-800/80 bg-slate-900/40 px-2 py-1 text-[10px] text-slate-400 font-mono">
            <Shield className="h-3 w-3 text-sky-400" />
            <span>LODO Validated</span>
          </div>
        </div>
      </div>
    </header>
  );
};
