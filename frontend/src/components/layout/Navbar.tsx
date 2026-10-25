import { Wind, TrendingDown, BookOpen, Activity, CheckCircle2 } from 'lucide-react';
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
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
            <Wind className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">
                UK National Wind Portal
              </span>
              <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
                JAN 2026
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Operational Gate-Closure & Imbalance Risk Portal
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
          <button
            type="button"
            onClick={() => onTabChange('decision')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'decision'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_-2px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Decision Desk</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('accuracy')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'accuracy'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_-2px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            <span>Accuracy & Horizon</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('methodology')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'methodology'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_-2px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Methodology & Audit</span>
          </button>
        </nav>

        {/* Live Snapshot Status */}
        <div className="hidden lg:flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-200">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>Snapshot Loaded</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {metadata?.january_periods_actual ?? 1488} / 1,488 SPs (100%)
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
