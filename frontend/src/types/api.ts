/**
 * TypeScript API contracts matching backend Pydantic v2 schemas.
 */

export interface DayAheadPeriod {
  settlement_period: number;
  start_time_utc: string;
  publish_time_utc: string;
  horizon_hours: number;
  forecast_mw: number;
  p10_lower_bound_mw: number;
  p90_upper_bound_mw: number;
  actual_mw?: number | null;
  error_mw?: number | null;
}

export interface DayAheadSummary {
  total_forecast_mwh: number;
  peak_forecast_mw: number;
  min_forecast_mw: number;
  recommended_risk_buffer_mw: number;
  downside_financial_exposure_gbp: number;
  actual_mwh?: number | null;
  day_mae_mw?: number | null;
  day_bias_mw?: number | null;
}

export interface DayAheadResponse {
  delivery_date: string;
  cutoff_applied_utc: string;
  cutoff_time_uk: string;
  summary: DayAheadSummary;
  periods: DayAheadPeriod[];
}

export interface ForecastVintageItem {
  publish_time_utc: string;
  horizon_hours: number;
  forecast_mw: number;
}

export interface VintagesResponse {
  delivery_date: string;
  settlement_period: number;
  start_time_utc: string;
  actual_mw?: number | null;
  vintages: ForecastVintageItem[];
}

export interface HorizonBucket {
  horizon_hours: number;
  mae_mw: number;
  rmse_mw: number;
  bias_mw: number;
  n_samples: number;
}

export interface HorizonAccuracyResponse {
  buckets: HorizonBucket[];
}

export interface AccuracySummaryResponse {
  total_samples: number;
  mean_actual_mw: number;
  mean_forecast_mw: number;
  mae_mw: number;
  rmse_mw: number;
  bias_mw: number;
  nmae: number;
  mape_pct: number;
  quantiles: Record<string, number>;
}

export interface TimeseriesAccuracyPoint {
  date: string;
  mae_mw: number;
  rmse_mw: number;
  bias_mw: number;
  forecast_mwh: number;
  actual_mwh: number;
  sample_count: number;
}

export interface TimeseriesAccuracyResponse {
  points: TimeseriesAccuracyPoint[];
}

export interface MetaResponse {
  dataset_health: string;
  total_actual_records: number;
  total_forecast_records: number;
  total_paired_records: number;
  january_periods_actual: number;
  january_completeness_pct: number;
  missing_intervals: string[];
  last_build_timestamp?: string | null;
}
