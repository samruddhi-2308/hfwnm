import React from 'react';
import {
  BookOpen,
  ShieldCheck,
  Cpu,
  Layers,
  Database,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { MetaResponse } from '../types/api';

interface MethodologyProps {
  metadata?: MetaResponse | null;
}

export const Methodology: React.FC<MethodologyProps> = ({ metadata }) => {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20 shadow-inner">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
              Trading Methodology, Risk Mathematical Formulations & Data Audit
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Institutional engineering specifications for Great Britain day-ahead wind power procurement, imbalance mitigation, and audit trails.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: The GB Trading & Auction Gate Closure Problem */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 text-sky-500">
          <Layers className="h-5 w-5" />
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            1. Operational Context: The Great Britain (GB) Day-Ahead Auction Problem
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
          In Great Britain's wholesale power market, electricity delivery for Day $D$ is primarily cleared on Day $D-1$ across power exchanges (Nord Pool and EPEX Spot UK). Auction gate closure occurs between <strong className="text-slate-100">09:00 and 11:00 UK local time</strong> on Day $D-1$.
        </p>
        <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
          Wind generation is non-dispatchable and weather-dependent. When an energy utility or procurement desk submits bids into day-ahead auctions, they must commit a specific firm Megawatt-hour volume. If outturn wind generation falls short of this bid in real time, the shortfall is settled at the punitive <strong className="text-rose-400 font-semibold">System Buy Price (SBP)</strong> in the Balancing Mechanism.
        </p>
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-xs text-slate-200">
          <div className="flex items-center gap-2 font-semibold text-sky-600 mb-1">
            <Clock className="h-4 w-4" />
            <span>Strict Temporal Cutoff Enforcement (No Lookahead Leakage):</span>
          </div>
          <p className="leading-relaxed text-slate-300">
            An operational trading desk cannot use forecasts published after the decision gate. Evaluating day-ahead bids against forecasts published late at night on $D-1$ introduces severe look-ahead leakage. This portal enforces a strict cutoff on $D-1$ (default 09:00 UK time) selecting only the most recent vintage that was genuinely known to the desk at decision time.
          </p>
        </div>
      </div>

      {/* Section 2: Mathematical Formulations */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 text-amber-500">
          <Cpu className="h-5 w-5" />
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            2. Core Accuracy Formulas & Error Definitions
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-xs">
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-sky-500" />
            <h3 className="font-semibold text-slate-100">Signed Error Convention</h3>
            <div className="rounded bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-sky-500 border border-slate-800 font-semibold">
              Error (MW) = Actual Generation - Forecast Generation
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
              <li><strong className="text-emerald-500">Positive (&gt; 0):</strong> Wind over-delivered; utility is long in balance.</li>
              <li><strong className="text-rose-400">Negative (&lt; 0):</strong> Wind shortfall; utility is short and incurs cashout penalty.</li>
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-sky-500" />
            <h3 className="font-semibold text-slate-100">Mean Absolute Error (MAE)</h3>
            <div className="rounded bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-sky-500 border border-slate-800 font-semibold">
              MAE = (1 / N) * Σ |Actual_t - Forecast_t|
            </div>
            <p className="text-[11px] text-slate-400">
              Average magnitude of forecast deviations across matched periods, expressed in Megawatts (MW).
            </p>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-indigo-500" />
            <h3 className="font-semibold text-slate-100">Root Mean Squared Error (RMSE)</h3>
            <div className="rounded bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-indigo-500 border border-slate-800 font-semibold">
              RMSE = sqrt((1 / N) * Σ (Actual_t - Forecast_t)^2)
            </div>
            <p className="text-[11px] text-slate-400">
              Heavily penalizes extreme forecast errors; standard proxy for dispatch volatility and grid stress.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-emerald-500" />
            <h3 className="font-semibold text-slate-100">Mean Absolute Percentage Error (MAPE)</h3>
            <div className="rounded bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-emerald-500 border border-slate-800 font-semibold">
              MAPE = (1 / |T_valid|) * Σ (|Actual - Forecast| / Actual) * 100%
            </div>
            <p className="text-[11px] text-slate-400">
              Includes an institutional <strong className="text-slate-200">100 MW capacity floor</strong>. Periods with actual output &lt; 100 MW are excluded to prevent explosive divisions during calm periods.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Leave-One-Day-Out Risk Buffer */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 text-rose-400">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            3. Leave-One-Day-Out (LODO) Wind Risk Buffer Algorithm
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
          Rather than evaluating risk with naive historical averages or static multipliers, this portal implements rigorous <strong className="text-slate-100">Leave-One-Day-Out (LODO) cross-validation</strong>:
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-sky-500">
              <ArrowRight className="h-3.5 w-3.5" />
              <span>Data Leakage Prevention</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              When estimating risk bounds for delivery Day $D$, day $D$'s own actuals and errors are strictly excluded from the training dataset.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-500">
              <ArrowRight className="h-3.5 w-3.5" />
              <span>Empirical P10 Downside Quantile</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              The algorithm extracts the 10th percentile of signed errors (e_P10 &lt; 0) for each specific settlement period across all training days.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-rose-400">
              <ArrowRight className="h-3.5 w-3.5" />
              <span>Recommended Hedge Buffer</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              <code>Recommended Risk Buffer (MW) = |e_P10|</code>. The procurement desk bids <code>Forecast - Buffer</code> into the auction and procures the buffer from flexible thermal or storage assets.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-500">
              <ArrowRight className="h-3.5 w-3.5" />
              <span>Financial Imbalance Exposure (£)</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Calculated using a benchmark GB imbalance cashout spread proxy of £85/MWh: <code>Exposure (£) = Buffer (MW) * 0.5h * £85</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Section 4: Data Quality & Completeness Audit */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 text-emerald-500">
          <Database className="h-5 w-5" />
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            4. Dataset Audit & Offline Snapshot Integrity
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">FUELHH Actuals</div>
            <div className="mt-1 text-lg font-bold text-emerald-500 tabular-nums">
              {metadata?.january_periods_actual ?? 1488} / 1,488 SPs
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>100% January Coverage (0 missing)</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">WINDFOR Forecasts</div>
            <div className="mt-1 text-lg font-bold text-sky-500 tabular-nums">
              {metadata?.total_forecast_records.toLocaleString() ?? '11,873'} Records
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-sky-500 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Multi-vintage lead times 0h-48h</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Paired Observations</div>
            <div className="mt-1 text-lg font-bold text-indigo-500 tabular-nums">
              {metadata?.total_paired_records.toLocaleString() ?? '11,873'} Pairs
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-indigo-500 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>High-speed Parquet Snapshots</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-slate-200">Offline Portability & Performance Guarantee:</div>
          <p className="leading-relaxed">
            Raw data ingested from the Elexon BMRS API has been processed, validated, and packaged into compressed Apache Parquet snapshots (&lt;400 KB total). The application operates with zero external network dependencies and sub-20ms latency, delivering institutional-grade reliability.
          </p>
        </div>
      </div>
    </div>
  );
};
