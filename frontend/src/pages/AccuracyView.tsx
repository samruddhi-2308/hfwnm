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
import { TrendingDown, Activity, BarChart2, ShieldCheck, Scale, Clock, Sparkles } from 'lucide-react';
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
          value={summary ? formatMW(summary.mae_mw) : '-'}
          subtitle="All paired observations"
          badge="MAE"
          variant="cyan"
          icon={<Activity className="h-4 w-4" />}
        />

        <MetricCard
          title="Root Mean Sq. Error"
          value={summary ? formatMW(summary.rmse_mw) : '-'}
          subtitle="Penalizes extreme tail spikes"
          badge="RMSE"
          variant="indigo"
          icon={<TrendingDown className="h-4 w-4" />}
        />

        <MetricCard
          title="Mean Bias Error"
          value={summary ? `${summary.bias_mw >= 0 ? '+' : ''}${formatMW(summary.bias_mw)}` : '-'}
          subtitle={summary && summary.bias_mw < 0 ? 'Net systemic shortfall' : 'Net overdelivery'}
          badge={summary && summary.bias_mw < 0 ? 'Systemic Shortfall' : 'Systemic Surplus'}
          variant={summary && summary.bias_mw < 0 ? 'rose' : 'emerald'}
          icon={<Scale className="h-4 w-4" />}
        />

        <MetricCard
          title="Normalized MAE"
          value={summary ? `${(summary.nmae * 100).toFixed(1)}%` : '-'}
          subtitle="Normalized by fleet capacity"
          badge="nMAE"
          variant="amber"
          icon={<BarChart2 className="h-4 w-4" />}
        />

        <MetricCard
          title="MAPE (100 MW Floor)"
          value={summary ? formatPercent(summary.mape_pct) : '-'}
          subtitle="Calm periods guarded"
          badge="Capacity Clamped"
          variant="emerald"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      {/* Hero Chart: Horizon Error Decay (0h to 48h) */}
      <div className="rounded-xl border border-slate-800/80 bg-[#FFFFFF]/90 p-5 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-sky-400"></span>
              <h2 className="text-sm font-semibold tracking-tight text-slate-100 sm:text-base">
                Horizon Uncertainty Decay Curve (0h to 48h Lead Times)
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Quantitative validation of error expansion as forecast horizon lengthens. Proves the economic value of intraday trading.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Aggregation Step:</span>
            <div className="inline-flex rounded-lg bg-slate-900/90 p-1 border border-slate-800/80">
              {[1.0, 2.0, 4.0].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setBucketStep(step)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                    bucketStep === step
                      ? 'bg-sky-500/20 text-sky-300 shadow-sm border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {step}h
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 h-[380px] w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              <Clock className="h-4 w-4 mr-2 animate-spin text-sky-400" />
              Computing horizon decay metrics across 11,873 forecast records...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={horizonData?.buckets || []}
                margin={{ top: 10, right: 15, left: -5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EC" vertical={false} />
                <XAxis
                  dataKey="horizon_hours"
                  stroke="#7A8B96"
                  tickLine={false}
                  fontSize={11}
                  tickFormatter={(h) => `${h}h`}
                />
                <YAxis
                  stroke="#7A8B96"
                  tickLine={false}
                  fontSize={11}
                  tickFormatter={(v) => `${v} MW`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const b = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-slate-700/80 bg-[#F3F6F8]/95 p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[210px]">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                          <span className="font-semibold text-slate-200">Lead Horizon:</span>
                          <span className="rounded bg-sky-500/10 px-1.5 py-0.5 font-mono font-bold text-sky-400 border border-sky-500/20">
                            +{b.horizon_hours}h ahead
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-sky-400 font-medium">MAE:</span>
                          <span className="tabular-nums font-bold text-slate-100">{formatMW(b.mae_mw)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-indigo-400 font-medium">RMSE:</span>
                          <span className="tabular-nums font-bold text-slate-100">{formatMW(b.rmse_mw)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-amber-400 font-medium">Mean Bias:</span>
                          <span className="tabular-nums text-slate-300">{formatMW(b.bias_mw)}</span>
                        </div>
                        <div className="flex justify-between gap-4 pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400">
                          <span>Sample Volume:</span>
                          <span className="tabular-nums text-slate-300 font-medium">{b.n_samples.toLocaleString()} pairs</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 16 }}
                  formatter={(val) => <span className="text-xs font-medium text-slate-300">{val}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="mae_mw"
                  name="Mean Absolute Error (MAE)"
                  stroke="#2A55E0"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#2A55E0', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#2A55E0', stroke: '#F4F6F8', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="rmse_mw"
                  name="Root Mean Squared Error (RMSE)"
                  stroke="#7C5CE6"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={{ r: 2.5, fill: '#7C5CE6', strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="bias_mw"
                  name="Mean Bias Error (MBE)"
                  stroke="#E39A0B"
                  strokeWidth={1.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Daily Progression Chart */}
      <div className="rounded-xl border border-slate-800/80 bg-[#FFFFFF]/90 p-5 shadow-sm backdrop-blur-md">
        <div className="border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
            <h2 className="text-sm font-semibold tracking-tight text-slate-100 sm:text-base">
              Daily Forecast Accuracy & Fleet Outturn Generation (Jan 1-31, 2026)
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Trajectory of daily MAE compared directly against aggregate GB wind generation outturn across all 31 days.
          </p>
        </div>

        <div className="mt-5 h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={timeseriesData?.points || []}
              margin={{ top: 10, right: 15, left: -5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EC" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#7A8B96"
                tickLine={false}
                fontSize={11}
                tickFormatter={(d) => `Jan ${d.slice(8)}`}
              />
              <YAxis
                yAxisId="left"
                stroke="#7A8B96"
                tickLine={false}
                fontSize={11}
                tickFormatter={(v) => `${v} MW`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#7A8B96"
                tickLine={false}
                fontSize={11}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k MWh`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-slate-700/80 bg-[#F3F6F8]/95 p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[210px]">
                      <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1.5 mb-2">
                        Delivery Date: {p.date}
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-sky-400 font-medium">Day MAE:</span>
                        <span className="tabular-nums font-bold text-slate-100">{formatMW(p.mae_mw)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-emerald-400 font-medium">Actual Outturn:</span>
                        <span className="tabular-nums font-bold text-slate-100">{(p.actual_mwh / 1000).toFixed(1)} GWh</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-amber-400 font-medium">Forecast Energy:</span>
                        <span className="tabular-nums text-slate-300">{(p.forecast_mwh / 1000).toFixed(1)} GWh</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: 16 }}
                formatter={(val) => <span className="text-xs font-medium text-slate-300">{val}</span>}
              />
              <Bar
                yAxisId="right"
                dataKey="actual_mwh"
                name="Actual Daily Outturn (MWh)"
                fill="#0F9D6B"
                fillOpacity={0.2}
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="mae_mw"
                name="Daily MAE (MW)"
                stroke="#2A55E0"
                strokeWidth={2}
                dot={{ r: 2.5, fill: '#2A55E0', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#2A55E0', stroke: '#F4F6F8', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quantiles breakdown */}
      {summary?.quantiles && (
        <div className="rounded-xl border border-slate-800/80 bg-[#FFFFFF]/90 p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-400" />
            <h3 className="text-sm font-semibold tracking-tight text-slate-100 sm:text-base">
              Signed Error Distribution Quantiles (Actual - Forecast)
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Empirical historical quantiles utilized by the Leave-One-Day-Out (LODO) risk model to determine optimal auction bid floors and thermal hedges.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
            {Object.entries(summary.quantiles).map(([qKey, qVal]) => {
              const isShortfall = qVal < 0;
              return (
                <div key={qKey} className="relative overflow-hidden rounded-lg border border-slate-800 bg-[#F3F6F8]/80 p-3 text-center">
                  <div
                    className={`absolute inset-x-0 top-0 h-[2px] ${
                      isShortfall ? 'bg-rose-500/60' : 'bg-emerald-500/60'
                    }`}
                  />
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {qKey.toUpperCase()}
                  </div>
                  <div className={`mt-1.5 tabular-nums text-sm font-bold ${isShortfall ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {qVal >= 0 ? `+${qVal.toFixed(0)}` : qVal.toFixed(0)} MW
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500 font-medium">
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
