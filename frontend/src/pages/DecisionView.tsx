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
  Table as TableIcon,
  LineChart as ChartIcon,
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
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

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
    p10_p90_range: [p.p10_lower_bound_mw, p.p90_upper_bound_mw],
    horizon: p.horizon_hours,
  })) || [];

  return (
    <div className="space-y-5">
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
          value={data ? (data.summary.total_forecast_mwh / 1000).toFixed(1) : '-'}
          unit="GWh"
          subtitle={data ? `Peak: ${formatMW(data.summary.peak_forecast_mw)}` : undefined}
          badge="Day-Ahead Bid"
          variant="cyan"
          icon={<Zap className="h-4 w-4" />}
        />

        <MetricCard
          title="Recommended Risk Buffer"
          value={data ? formatMW(data.summary.recommended_risk_buffer_mw) : '-'}
          subtitle="Empirical P10 shortfall hedge"
          badge="LODO L10"
          variant="amber"
          icon={<ShieldCheck className="h-4 w-4" />}
        />

        <MetricCard
          title="Downside Imbalance Risk"
          value={data ? formatGBP(data.summary.downside_financial_exposure_gbp) : '-'}
          subtitle="Benchmark £85/MWh cashout spread"
          badge="Exposure"
          variant="rose"
          icon={<AlertTriangle className="h-4 w-4" />}
        />

        <MetricCard
          title="Actual Outturn Energy"
          value={data?.summary.actual_mwh ? (data.summary.actual_mwh / 1000).toFixed(1) : '-'}
          unit="GWh"
          subtitle={data?.summary.day_mae_mw ? `Day MAE: ${formatMW(data.summary.day_mae_mw)}` : 'Overlay Active'}
          badge={data?.summary.day_bias_mw !== undefined && data.summary.day_bias_mw !== null
            ? (data.summary.day_bias_mw >= 0 ? `+${data.summary.day_bias_mw} MW Long` : `${data.summary.day_bias_mw} MW Short`)
            : 'Outturn'}
          variant="emerald"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Main Operational Card */}
      <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-5 backdrop-blur-md shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-100">
                Operational Wind Dispatch Schedule
              </h2>
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                48 Settlement Periods
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Cutoff applied: {data?.cutoff_applied_utc ? new Date(data.cutoff_applied_utc).toUTCString() : '-'} (Zero look-ahead)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/60 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  viewMode === 'chart'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ChartIcon className="h-3.5 w-3.5" />
                <span>Curve</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  viewMode === 'table'
                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Ledger (48 SPs)</span>
              </button>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700">
              <input
                type="checkbox"
                checked={includeActuals}
                onChange={(e) => setIncludeActuals(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0"
              />
              <span>Overlay Outturn</span>
            </label>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={!data || loading}
              className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 transition-all hover:bg-sky-500/20 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* View Mode: Chart */}
        {viewMode === 'chart' && (
          <div className="mt-4 h-[440px] w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Loading operational forecast...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 12, right: 12, left: -8, bottom: 4 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const periodNum = e.activePayload[0].payload.period;
                      setSelectedPeriod(periodNum);
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="p10p90Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E39A0B" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#E39A0B" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EC" vertical={false} />
                  <XAxis
                    dataKey="period"
                    stroke="#7A8B96"
                    tickLine={false}
                    fontSize={11}
                    tickFormatter={(p) => (p % 6 === 1 || p === 48 ? `SP ${p}` : '')}
                  />
                  <YAxis
                    stroke="#7A8B96"
                    tickLine={false}
                    fontSize={11}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const p = payload[0].payload;
                      const err = p.actual !== null && p.actual !== undefined ? p.actual - p.forecast : null;
                      return (
                        <div className="rounded-xl border border-slate-700 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-md text-xs min-w-[240px]">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                            <span className="font-semibold text-slate-200">
                              {formatPeriodTime(p.period)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.horizon}h Lead
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center gap-4">
                              <span className="flex items-center gap-1.5 text-slate-300">
                                <span className="h-2 w-2 rounded-full bg-sky-400" />
                                <span>Day-Ahead Bid:</span>
                              </span>
                              <span className="tabular-nums font-bold text-slate-100">{formatMW(p.forecast)}</span>
                            </div>

                            {p.actual !== null && p.actual !== undefined && (
                              <div className="flex justify-between items-center gap-4">
                                <span className="flex items-center gap-1.5 text-slate-300">
                                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                  <span>Outturn Actual:</span>
                                </span>
                                <span className="tabular-nums font-bold text-slate-100">{formatMW(p.actual)}</span>
                              </div>
                            )}

                            {err !== null && (
                              <div className="flex justify-between items-center gap-4">
                                <span className="text-slate-400">Variance:</span>
                                <span className={`tabular-nums font-semibold ${err >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {err >= 0 ? `+${err.toFixed(0)} MW (Surplus)` : `${err.toFixed(0)} MW (Shortfall)`}
                                </span>
                              </div>
                            )}

                            <div className="pt-1.5 border-t border-slate-800/80 space-y-1 text-[11px]">
                              <div className="flex justify-between text-amber-300">
                                <span>P10 Downside Floor:</span>
                                <span className="tabular-nums font-semibold">{formatMW(p.p10)}</span>
                              </div>
                              <div className="flex justify-between text-slate-400">
                                <span>P90 Upside Ceiling:</span>
                                <span className="tabular-nums font-medium">{formatMW(p.p90)}</span>
                              </div>
                              <div className="flex justify-between text-slate-300 font-semibold pt-1">
                                <span>Thermal Hedge Buffer:</span>
                                <span className="tabular-nums text-amber-400 font-bold">
                                  {formatMW(p.forecast - p.p10)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-sky-400 text-center font-medium">
                            Click to view vintage convergence table
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 14 }}
                    formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
                  />

                  {/* Shaded P10-P90 Risk Confidence Band */}
                  <Area
                    type="monotone"
                    dataKey="p10_p90_range"
                    name="P10-P90 LODO Risk Envelope"
                    stroke="none"
                    fill="url(#p10p90Gradient)"
                  />

                  {/* Day-Ahead Cutoff Forecast Line */}
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name="Day-Ahead Forecast (Cutoff)"
                    stroke="#2A55E0"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#2A55E0', stroke: '#F4F6F8', strokeWidth: 2 }}
                  />

                  {/* Actual Outturn Line */}
                  {includeActuals && (
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual Outturn (FUELHH)"
                      stroke="#0F9D6B"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="4 3"
                      activeDot={{ r: 5, fill: '#0F9D6B', stroke: '#F4F6F8', strokeWidth: 2 }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* View Mode: Settlement Ledger Table (All 48 SPs) */}
        {viewMode === 'table' && (
          <div className="mt-4 max-h-[500px] overflow-y-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Forecast (MW)</th>
                  <th className="py-2.5 px-3">P10 Floor</th>
                  <th className="py-2.5 px-3">Hedge Buffer</th>
                  <th className="py-2.5 px-3">Actual (MW)</th>
                  <th className="py-2.5 px-3">Error (MW)</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {data?.periods.map((p) => {
                  const buffer = p.forecast_mw - p.p10_lower_bound_mw;
                  const err = p.error_mw;
                  return (
                    <tr key={p.settlement_period} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-200">
                        SP {p.settlement_period}
                      </td>
                      <td className="py-2 px-3 text-slate-400 tabular-nums">
                        {p.start_time_utc.slice(11, 16)} UTC
                      </td>
                      <td className="py-2 px-3 font-bold text-sky-400 tabular-nums">
                        {formatMW(p.forecast_mw)}
                      </td>
                      <td className="py-2 px-3 text-amber-400 tabular-nums">
                        {formatMW(p.p10_lower_bound_mw)}
                      </td>
                      <td className="py-2 px-3 font-semibold text-amber-300 tabular-nums">
                        {formatMW(buffer)}
                      </td>
                      <td className="py-2 px-3 text-emerald-400 tabular-nums">
                        {p.actual_mw !== null && p.actual_mw !== undefined ? formatMW(p.actual_mw) : '-'}
                      </td>
                      <td className="py-2 px-3 tabular-nums font-semibold">
                        {err !== null && err !== undefined ? (
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                              err >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {err >= 0 ? `+${err.toFixed(0)}` : err.toFixed(0)} MW
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => setSelectedPeriod(p.settlement_period)}
                          className="text-[11px] font-medium text-sky-400 hover:text-sky-300 hover:underline"
                        >
                          Vintages
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vintage Lead-Time Inspector (when clicked on chart or SP) */}
      {selectedPeriod !== null && (
        <div className="rounded-xl border border-sky-500/30 bg-slate-900/90 p-5 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-sky-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Forecast Vintage Convergence - {formatPeriodTime(selectedPeriod)} on {deliveryDate}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPeriod(null)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
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
                    <th className="py-2 px-2">Published Time (UTC)</th>
                    <th className="py-2 px-2">Lead Horizon</th>
                    <th className="py-2 px-2">Forecast (MW)</th>
                    <th className="py-2 px-2">Actual Outturn</th>
                    <th className="py-2 px-2">Error (MW)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {vintagesData.vintages.map((v, i) => {
                    const actual = vintagesData.actual_mw;
                    const err = actual !== null && actual !== undefined ? actual - v.forecast_mw : null;
                    return (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="py-2 px-2 tabular-nums text-slate-300 font-mono">
                          {new Date(v.publish_time_utc).toISOString().replace('.000Z', 'Z')}
                        </td>
                        <td className="py-2 px-2 tabular-nums text-slate-300">{v.horizon_hours} hrs</td>
                        <td className="py-2 px-2 tabular-nums font-semibold text-sky-400">{formatMW(v.forecast_mw)}</td>
                        <td className="py-2 px-2 tabular-nums text-emerald-400">{actual ? formatMW(actual) : '-'}</td>
                        <td className={`py-2 px-2 tabular-nums font-semibold ${err !== null && err >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {err !== null ? (err >= 0 ? `+${err.toFixed(0)}` : err.toFixed(0)) : '-'}
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
