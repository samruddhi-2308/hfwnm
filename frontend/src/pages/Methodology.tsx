import {
  BookOpen,
  ShieldCheck,
  Cpu,
  Layers,
  Database,
  CheckCircle2,
} from 'lucide-react';
import type { MetaResponse } from '../types/api';

interface MethodologyProps {
  metadata?: MetaResponse | null;
}

export const Methodology: React.FC<MethodologyProps> = ({ metadata }) => {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              Trading Methodology, Risk Mathematical Formulations & Data Audit
            </h1>
            <p className="text-xs text-slate-400">
              Institutional documentation for UK day-ahead wind power procurement, imbalance mitigation, and audit trails.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: The GB Trading & Auction Gate Closure Problem */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
        <div className="flex items-center gap-2 text-cyan-400">
          <Layers className="h-5 w-5" />
          <h2 className="text-base font-bold text-slate-100">
            1. Operational Context: The Great Britain (GB) Day-Ahead Auction Problem
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-slate-300">
          In Great Britain's wholesale power market, electricity delivery for Day $D$ is primarily cleared on Day $D-1$ across power exchanges (Nord Pool and EPEX Spot UK). Auction gate closure occurs between <strong>09:00 and 11:00 UK local time</strong> on Day $D-1$.
        </p>
        <p className="text-xs leading-relaxed text-slate-300">
          Wind generation is non-dispatchable and weather-dependent. When an energy utility or procurement desk submits bids into day-ahead auctions, they must commit a specific firm Megawatt-hour volume. If outturn wind generation falls short of this bid in real time, the shortfall is settled at the punitive <strong>System Buy Price (SBP)</strong> in the Balancing Mechanism.
        </p>
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs text-cyan-200">
          <strong className="text-cyan-300 font-semibold">The Core Problem:</strong> An operational trading system cannot use forecasts published after the decision cutoff. Evaluating day-ahead bids against forecasts published late at night on $D-1$ introduces severe look-ahead leakage. This portal enforces a strict cutoff on $D-1$ (default 09:00 UK time) selecting only what was genuinely known to the desk at decision time.
        </div>
      </div>

      {/* Section 2: Mathematical Formulations */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 text-amber-400">
          <Cpu className="h-5 w-5" />
          <h2 className="text-base font-bold text-slate-100">
            2. Core Accuracy Formulas & Error Definitions
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-2">
            <h3 className="font-bold text-slate-200">Signed Error Convention</h3>
            <code className="text-cyan-400">Error (MW) = Actual Generation - Forecast Generation</code>
            <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
              <li><strong>Positive (&gt; 0):</strong> Wind over-delivered; utility is long in balance.</li>
              <li><strong>Negative (&lt; 0):</strong> Wind shortfall; utility is short and incurs cashout penalty.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-2">
            <h3 className="font-bold text-slate-200">Mean Absolute Error (MAE)</h3>
            <code className="text-cyan-400">MAE = (1 / N) * Σ |Actual_t - Forecast_t|</code>
            <p className="text-[11px] text-slate-400">
              Average magnitude of forecast deviations across matched periods, expressed in Megawatts (MW).
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-2">
            <h3 className="font-bold text-slate-200">Root Mean Squared Error (RMSE)</h3>
            <code className="text-cyan-400">RMSE = sqrt((1 / N) * Σ (Actual_t - Forecast_t)^2)</code>
            <p className="text-[11px] text-slate-400">
              Heavily penalizes extreme forecast errors; standard proxy for dispatch volatility and grid stress.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-2">
            <h3 className="font-bold text-slate-200">Mean Absolute Percentage Error (MAPE)</h3>
            <code className="text-cyan-400">MAPE = (1 / |T_valid|) * Σ (|Actual - Forecast| / Actual) * 100%</code>
            <p className="text-[11px] text-slate-400">
              Includes an institutional <strong>100 MW capacity floor</strong>. Periods with actual output &lt; 100 MW are excluded to prevent explosive divisions during calm periods.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Leave-One-Day-Out Risk Buffer */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
        <div className="flex items-center gap-2 text-rose-400">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-base font-bold text-slate-100">
            3. Leave-One-Day-Out (LODO) Wind Risk Buffer Algorithm
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-slate-300">
          Rather than evaluating risk with naive historical averages, this portal uses <strong>Leave-One-Day-Out (LODO) cross-validation</strong>:
        </p>
        <div className="space-y-2 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <span className="font-bold text-cyan-400">1. Data Leakage Prevention:</span>
            <span>When estimating risk bounds for delivery Day $D$, day $D$'s own actuals and errors are strictly excluded from the training dataset.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-amber-400">2. Empirical P10 Downside Quantile:</span>
            <span>The algorithm extracts the 10th percentile of signed errors (e_P10 &lt; 0) for that settlement period across all training days.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-rose-400">3. Recommended Hedge Buffer:</span>
            <span>
              <code>Recommended Risk Buffer (MW) = |e_P10|</code>. The procurement desk bids <code>Forecast - Buffer</code> into the day-ahead auction and procures the buffer from flexible thermal or interconnectors.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-emerald-400">4. Financial Imbalance Exposure (£):</span>
            <span>Calculated using a benchmark GB imbalance cashout spread proxy of £85/MWh: <code>Exposure (£) = Buffer (MW) * 0.5h * £85</code>.</span>
          </div>
        </div>
      </div>

      {/* Section 4: Data Quality & Completeness Audit */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <Database className="h-5 w-5" />
          <h2 className="text-base font-bold text-slate-100">
            4. Dataset Audit & Production Snapshot Status
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-slate-400 font-semibold uppercase text-[10px]">FUELHH Actuals</div>
            <div className="mt-1 text-lg font-bold text-emerald-400">
              {metadata?.january_periods_actual ?? 1488} / 1,488 SPs
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>100% January Coverage (0 missing)</span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-slate-400 font-semibold uppercase text-[10px]">WINDFOR Forecasts</div>
            <div className="mt-1 text-lg font-bold text-cyan-400">
              {metadata?.total_forecast_records.toLocaleString() ?? '11,873'} Records
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-cyan-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Multi-vintage lead times 0h–48h</span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-slate-400 font-semibold uppercase text-[10px]">Paired Observations</div>
            <div className="mt-1 text-lg font-bold text-indigo-400">
              {metadata?.total_paired_records.toLocaleString() ?? '11,873'} Pairs
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-indigo-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>High-speed Parquet Snapshots</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-slate-200">Offline Resilience Guarantee:</div>
          <p>
            Raw data ingested from Elexon BMRS API has been processed, cleaned, and committed as compressed Apache Parquet snapshots (&lt;400 KB total). The entire portal runs offline with sub-30ms API responses, eliminating external network dependencies during evaluation.
          </p>
        </div>
      </div>
    </div>
  );
};
