import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Download,
  ShieldCheck,
  AlertTriangle,
  Zap,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { api } from '../api/client';
import type { DayAheadResponse, VintagesResponse } from '../types/api';
import { MetricCard } from '../components/common/MetricCard';
import { CutoffSlider } from '../components/filters/CutoffSlider';
import { DateSelector } from '../components/filters/DateSelector';
import { formatMW, formatGBP, formatPeriodTime } from '../utils/format';

export const DecisionView: React.FC = () => {
  const [deliveryDate, setDeliveryDate] = useState('2026-01-15');
  const [cutoffTime, setCutoffTime] = useState('09:00');
  const [includeActuals, setIncludeActuals] = useState(true);

  const [data, setData] = useState<DayAheadResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vintages modal/inspector state
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [vintagesData, setVintagesData] = useState<VintagesResponse | null>(null);
  const [vintagesLoading, setVintagesLoading] = useState(false);

  // Fetch forecast data whenever date, cutoff, or includeActuals changes
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    api
      .getDayAheadForecast(deliveryDate, cutoffTime, includeActuals)
      .then((res) => {
        if (!isCancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err.message || 'Failed to fetch day-ahead forecast.');
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [deliveryDate, cutoffTime, includeActuals]);

  // Fetch vintages when a period is selected
  useEffect(() => {
    if (selectedPeriod === null) {
      setVintagesData(null);
      return;
    }
    setVintagesLoading(true);
    api
      .getForecastVintages(deliveryDate, selectedPeriod)
      .then((res) => {
        setVintagesData(res);
        setVintagesLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load vintages:', err);
        setVintagesLoading(false);
      });
  }, [deliveryDate, selectedPeriod]);

  // Download CSV handler
  const handleExportCSV = () => {
    if (!data) return;
    const headers = [
      'SettlementPeriod',
      'StartTimeUTC',
      'PublishTimeUTC',
      'HorizonHours',
      'ForecastMW',
      'P10LowerBoundMW',
      'P90UpperBoundMW',
      'RiskBufferMW',
      'ActualMW',
      'ErrorMW',
    ];

    const rows = data.periods.map((p) => [
      p.settlement_period,
      p.start_time_utc,
      p.publish_time_utc,
      p.horizon_hours,
      p.forecast_mw,
      p.p10_lower_bound_mw,
      p.p90_upper_bound_mw,
      (p.forecast_mw - p.p10_lower_bound_mw).toFixed(1),
      p.actual_mw ?? '',
      p.error_mw ?? '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `uk_wind_schedule_${deliveryDate}_cutoff_${cutoffTime.replace(':', '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart data formatting: calculate band for Recharts
  const chartData = data?.periods.map((p) => ({
    period: p.settlement_period,
    label: `SP ${p.settlement_period}`,
    forecast: p.forecast_mw,
    actual: p.actual_mw,
    p10: p.p10_lower_bound_mw,
    p90: p.p90_upper_bound_mw,
    // Shaded area: [p10, p90]
    p10_p90_range: [p.p10_lower_bound_mw, p.p90_upper_bound_mw],
    horizon: p.horizon_hours,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Top Controls: Date Selector + Cutoff Slider */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DateSelector
          selectedDate={deliveryDate}
          onChange={setDeliveryDate}
          disabled={loading}
        />
        <CutoffSlider
          cutoffTime={cutoffTime}
          onChange={setCutoffTime}
          disabled={loading}
        />
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Forecast Energy"
          value={data ? (data.summary.total_forecast_mwh / 1000).toFixed(1) : '—'}
          unit="GWh"
          subtitle={data ? `Peak: ${formatMW(data.summary.peak_forecast_mw)}` : undefined}
          badge="Day-Ahead"
          variant="cyan"
          icon={<Zap className="h-4 w-4" />}
        />

        <MetricCard
          title="Recommended Risk Buffer"
          value={data ? formatMW(data.summary.recommended_risk_buffer_mw) : '—'}
          subtitle="Empirical P10 shortfall hedge"
          badge="LODO L10"
          variant="amber"
          icon={<ShieldCheck className="h-4 w-4" />}
        />

        <MetricCard
          title="Downside Imbalance Risk"
          value={data ? formatGBP(data.summary.downside_financial_exposure_gbp) : '—'}
          subtitle="Benchmark £85/MWh cashout spread"
          badge="Exposure"
          variant="rose"
          icon={<AlertTriangle className="h-4 w-4" />}
        />

        <MetricCard
          title="Actual Outturn Energy"
          value={data?.summary.actual_mwh ? (data.summary.actual_mwh / 1000).toFixed(1) : '—'}
          unit="GWh"
          subtitle={data?.summary.day_mae_mw ? `Day MAE: ${formatMW(data.summary.day_mae_mw)}` : 'Overlay Active'}
          badge={data?.summary.day_bias_mw !== undefined && data.summary.day_bias_mw !== null
            ? (data.summary.day_bias_mw >= 0 ? `+${data.summary.day_bias_mw} MW Long` : `${data.summary.day_bias_mw} MW Short`)
            : 'Outturn'}
          variant="emerald"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Main Operational Chart Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Operational Day-Ahead Wind Forecast vs Actual Generation
            </h2>
            <p className="text-xs text-slate-400">
              Cutoff applied: {data?.cutoff_applied_utc ? new Date(data.cutoff_applied_utc).toUTCString() : '—'} (Zero look-ahead)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700">
              <input
                type="checkbox"
                checked={includeActuals}
                onChange={(e) => setIncludeActuals(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
              />
              <span>Overlay Outturn</span>
            </label>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={!data || loading}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-all hover:bg-cyan-500/20 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="mt-4 h-[420px] w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Loading operational forecast...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const periodNum = e.activePayload[0].payload.period;
                    setSelectedPeriod(periodNum);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="#64748b"
                  tickLine={false}
                  fontSize={11}
                  tickFormatter={(p) => (p % 6 === 1 || p === 48 ? `SP ${p}` : '')}
                />
                <YAxis
                  stroke="#64748b"
                  tickLine={false}
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 shadow-xl text-xs">
                        <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1 mb-2">
                          {formatPeriodTime(p.period)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-cyan-400">Forecast:</span>
                            <span className="tabular-nums font-bold text-slate-100">{formatMW(p.forecast)}</span>
                          </div>
                          {p.actual !== null && p.actual !== undefined && (
                            <div className="flex justify-between gap-4">
                              <span className="text-emerald-400">Actual Outturn:</span>
                              <span className="tabular-nums font-bold text-slate-100">{formatMW(p.actual)}</span>
                            </div>
                          )}
                          <div className="flex justify-between gap-4">
                            <span className="text-amber-400">P10 Lower Bound:</span>
                            <span className="tabular-nums text-slate-300">{formatMW(p.p10)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-amber-400">P90 Upper Bound:</span>
                            <span className="tabular-nums text-slate-300">{formatMW(p.p90)}</span>
                          </div>
                          <div className="flex justify-between gap-4 pt-1 border-t border-slate-800/80">
                            <span className="text-slate-400">Lead Horizon:</span>
                            <span className="tabular-nums text-slate-300">{p.horizon} hrs</span>
                          </div>
                        </div>
                        <div className="mt-2 text-[10px] text-cyan-400 text-center font-medium">
                          Click to view vintage convergence
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 10 }}
                  formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
                />

                {/* Shaded P10-P90 Risk Confidence Band */}
                <Area
                  type="monotone"
                  dataKey="p10_p90_range"
                  name="P10-P90 LODO Confidence Band"
                  stroke="none"
                  fill="#f59e0b"
                  fillOpacity={0.12}
                />

                {/* Day-Ahead Cutoff Forecast Line */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Day-Ahead Forecast (Cutoff)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#06b6d4' }}
                />

                {/* Actual Outturn Line */}
                {includeActuals && (
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual Outturn (FUELHH)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="4 2"
                    activeDot={{ r: 5, fill: '#10b981' }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Vintage Lead-Time Inspector (when clicked on chart or SP) */}
      {selectedPeriod !== null && (
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 p-5 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Forecast Vintage Convergence — {formatPeriodTime(selectedPeriod)} on {deliveryDate}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPeriod(null)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
            >
              Close
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            Shows how forecasts for this half-hour evolved from 48 hours prior until real-time delivery.
            Demonstrates forecast convergence as weather model uncertainty resolved.
          </p>

          <div className="mt-4 overflow-x-auto">
            {vintagesLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading vintages...</div>
            ) : vintagesData?.vintages.length ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400">
                    <th className="py-2">Published Time (UTC)</th>
                    <th className="py-2">Lead Horizon</th>
                    <th className="py-2">Forecast (MW)</th>
                    <th className="py-2">Actual Outturn</th>
                    <th className="py-2">Error (MW)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {vintagesData.vintages.map((v, i) => {
                    const actual = vintagesData.actual_mw;
                    const err = actual !== null && actual !== undefined ? actual - v.forecast_mw : null;
                    return (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="py-2 tabular-nums text-slate-300">
                          {new Date(v.publish_time_utc).toISOString().replace('.000Z', 'Z')}
                        </td>
                        <td className="py-2 tabular-nums text-slate-300">{v.horizon_hours} hrs</td>
                        <td className="py-2 tabular-nums font-semibold text-cyan-400">{formatMW(v.forecast_mw)}</td>
                        <td className="py-2 tabular-nums text-emerald-400">{actual ? formatMW(actual) : '—'}</td>
                        <td className={`py-2 tabular-nums font-medium ${err !== null && err >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {err !== null ? (err >= 0 ? `+${err.toFixed(0)}` : err.toFixed(0)) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                No intermediate vintages recorded for this period.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
