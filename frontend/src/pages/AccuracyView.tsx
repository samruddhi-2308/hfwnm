import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { TrendingDown, Activity, BarChart2, ShieldCheck, Scale } from 'lucide-react';
import { api } from '../api/client';
import type {
  AccuracySummaryResponse,
  HorizonAccuracyResponse,
  TimeseriesAccuracyResponse,
} from '../types/api';
import { MetricCard } from '../components/common/MetricCard';
import { formatMW, formatPercent } from '../utils/format';

export const AccuracyView: React.FC = () => {
  const [summary, setSummary] = useState<AccuracySummaryResponse | null>(null);
  const [horizonData, setHorizonData] = useState<HorizonAccuracyResponse | null>(null);
  const [timeseriesData, setTimeseriesData] = useState<TimeseriesAccuracyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [bucketStep, setBucketStep] = useState<number>(2.0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getAccuracySummary(),
      api.getAccuracyByHorizon({ bucketHours: bucketStep }),
      api.getAccuracyTimeseries(),
    ])
      .then(([s, h, t]) => {
        setSummary(s);
        setHorizonData(h);
        setTimeseriesData(t);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load accuracy metrics:', err);
        setLoading(false);
      });
  }, [bucketStep]);

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard
          title="Mean Absolute Error"
          value={summary ? formatMW(summary.mae_mw) : '—'}
          subtitle="MAE across all pairs"
          badge="MAE"
          variant="cyan"
          icon={<Activity className="h-4 w-4" />}
        />

        <MetricCard
          title="Root Mean Sq. Error"
          value={summary ? formatMW(summary.rmse_mw) : '—'}
          subtitle="Penalizes large errors"
          badge="RMSE"
          variant="indigo"
          icon={<TrendingDown className="h-4 w-4" />}
        />

        <MetricCard
          title="Mean Bias Error"
          value={summary ? `${summary.bias_mw >= 0 ? '+' : ''}${formatMW(summary.bias_mw)}` : '—'}
          subtitle={summary && summary.bias_mw < 0 ? 'Net systemic shortfall' : 'Net overdelivery'}
          badge={summary && summary.bias_mw < 0 ? 'Shortfall' : 'Surplus'}
          variant={summary && summary.bias_mw < 0 ? 'rose' : 'emerald'}
          icon={<Scale className="h-4 w-4" />}
        />

        <MetricCard
          title="Normalized MAE"
          value={summary ? `${(summary.nmae * 100).toFixed(1)}%` : '—'}
          subtitle="Normalized by mean output"
          badge="nMAE"
          variant="amber"
          icon={<BarChart2 className="h-4 w-4" />}
        />

        <MetricCard
          title="MAPE (Capacity Floor)"
          value={summary ? formatPercent(summary.mape_pct) : '—'}
          subtitle="100 MW capacity floor applied"
          badge="MAPE"
          variant="emerald"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      {/* Hero Chart: Horizon Error Decay (0h to 48h) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Horizon Uncertainty Dynamics: Error Decay Across Lead Times (0h–48h)
            </h2>
            <p className="text-xs text-slate-400">
              Empirical proof of forecast accuracy decay as lead time expands. Proves the quantitative value of intraday re-balancing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Horizon Step:</span>
            {[1.0, 2.0, 4.0].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setBucketStep(step)}
                className={`rounded px-2.5 py-1 text-xs font-semibold ${
                  bucketStep === step
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {step}h
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 h-[380px] w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Loading horizon dynamics...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={horizonData?.buckets || []}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="horizon_hours"
                  stroke="#64748b"
                  tickLine={false}
                  fontSize={11}
                  tickFormatter={(h) => `${h}h`}
                />
                <YAxis
                  stroke="#64748b"
                  tickLine={false}
                  fontSize={11}
                  tickFormatter={(v) => `${v} MW`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const b = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 shadow-xl text-xs space-y-1">
                        <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1 mb-2">
                          Horizon Lead Time: {b.horizon_hours} Hours
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-cyan-400">MAE:</span>
                          <span className="tabular-nums font-bold text-slate-100">{formatMW(b.mae_mw)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-indigo-400">RMSE:</span>
                          <span className="tabular-nums font-bold text-slate-100">{formatMW(b.rmse_mw)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-amber-400">Mean Bias:</span>
                          <span className="tabular-nums text-slate-300">{formatMW(b.bias_mw)}</span>
                        </div>
                        <div className="flex justify-between gap-4 pt-1 border-t border-slate-800/80">
                          <span className="text-slate-400">Observations:</span>
                          <span className="tabular-nums text-slate-300">{b.n_samples.toLocaleString()} pairs</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 10 }}
                  formatter={(val) => <span className="text-xs text-slate-300">{val}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="mae_mw"
                  name="Mean Absolute Error (MAE)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#06b6d4' }}
                />
                <Line
                  type="monotone"
                  dataKey="rmse_mw"
                  name="Root Mean Squared Error (RMSE)"
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={{ r: 3, fill: '#6366f1' }}
                />
                <Line
                  type="monotone"
                  dataKey="bias_mw"
                  name="Mean Bias Error (MBE)"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Daily Progression Chart */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-base font-bold text-slate-100">
            Daily Forecast Accuracy & Outturn Generation Across January 2026
          </h2>
          <p className="text-xs text-slate-400">
            Trajectory of daily MAE alongside actual outturn energy across all 31 days.
          </p>
        </div>

        <div className="mt-4 h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={timeseriesData?.points || []}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                tickLine={false}
                fontSize={11}
                tickFormatter={(d) => d.slice(8)} // Show day (01, 02, ...)
              />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                tickLine={false}
                fontSize={11}
                tickFormatter={(v) => `${v} MW`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#64748b"
                tickLine={false}
                fontSize={11}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k MWh`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 shadow-xl text-xs space-y-1">
                      <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1 mb-2">
                        Settlement Date: {p.date}
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-cyan-400">Day MAE:</span>
                        <span className="tabular-nums font-bold text-slate-100">{formatMW(p.mae_mw)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-emerald-400">Actual Outturn:</span>
                        <span className="tabular-nums font-bold text-slate-100">{(p.actual_mwh / 1000).toFixed(1)} GWh</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-amber-400">Forecast Total:</span>
                        <span className="tabular-nums text-slate-300">{(p.forecast_mwh / 1000).toFixed(1)} GWh</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(val) => <span className="text-xs text-slate-300">{val}</span>}
              />
              <Bar
                yAxisId="right"
                dataKey="actual_mwh"
                name="Actual Daily Outturn (MWh)"
                fill="#10b981"
                fillOpacity={0.25}
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="mae_mw"
                name="Daily MAE (MW)"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 3, fill: '#06b6d4' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quantiles breakdown */}
      {summary?.quantiles && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <h3 className="text-sm font-bold text-slate-100">
            Empirical Signed Error Distribution Quantiles (Actual - Forecast)
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Used by the Leave-One-Day-Out (LODO) algorithm to establish firm wind bids and thermal backup buffers.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {Object.entries(summary.quantiles).map(([qKey, qVal]) => {
              const isShortfall = qVal < 0;
              return (
                <div key={qKey} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {qKey.toUpperCase()}
                  </div>
                  <div className={`mt-1 tabular-nums text-sm font-bold ${isShortfall ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {qVal >= 0 ? `+${qVal.toFixed(0)}` : qVal.toFixed(0)} MW
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {isShortfall ? 'Downside Risk' : 'Surplus Generation'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
