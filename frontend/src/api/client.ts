/**
 * API client for the UK Wind Forecast Portal backend.
 */
import type {
  DayAheadResponse,
  VintagesResponse,
  AccuracySummaryResponse,
  HorizonAccuracyResponse,
  TimeseriesAccuracyResponse,
  MetaResponse,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function fetchJson<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, String(val));
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error [${response.status}] ${response.statusText}: ${errorBody}`);
  }

  return response.json();
}

export const api = {
  getDayAheadForecast: (deliveryDate: string, cutoffTime: string = '09:00', includeActuals: boolean = true) =>
    fetchJson<DayAheadResponse>('/api/v1/forecast/dayahead', {
      delivery_date: deliveryDate,
      cutoff_time: cutoffTime,
      include_actuals: includeActuals,
    }),

  getForecastVintages: (deliveryDate: string, settlementPeriod: number) =>
    fetchJson<VintagesResponse>('/api/v1/forecast/vintages', {
      delivery_date: deliveryDate,
      settlement_period: settlementPeriod,
    }),

  getAccuracySummary: (params?: { startDate?: string; endDate?: string; minHorizon?: number; maxHorizon?: number }) =>
    fetchJson<AccuracySummaryResponse>('/api/v1/accuracy/summary', {
      start_date: params?.startDate,
      end_date: params?.endDate,
      min_horizon: params?.minHorizon,
      max_horizon: params?.maxHorizon,
    }),

  getAccuracyByHorizon: (params?: { startDate?: string; endDate?: string; bucketHours?: number }) =>
    fetchJson<HorizonAccuracyResponse>('/api/v1/accuracy/by-horizon', {
      start_date: params?.startDate,
      end_date: params?.endDate,
      bucket_hours: params?.bucketHours ?? 1.0,
    }),

  getAccuracyTimeseries: (params?: { startDate?: string; endDate?: string; minHorizon?: number; maxHorizon?: number }) =>
    fetchJson<TimeseriesAccuracyResponse>('/api/v1/accuracy/timeseries', {
      start_date: params?.startDate,
      end_date: params?.endDate,
      min_horizon: params?.minHorizon,
      max_horizon: params?.maxHorizon,
    }),

  getMetadata: () => fetchJson<MetaResponse>('/api/v1/meta'),
};
