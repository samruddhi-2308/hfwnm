/**
 * Number and financial formatting helpers for trading desk UI.
 */

export function formatMW(val?: number | null, decimals: number = 0): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `${val.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} MW`;
}

export function formatMWh(val?: number | null, decimals: number = 0): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `${val.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} MWh`;
}

export function formatGBP(val?: number | null, decimals: number = 0): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `£${val.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatPercent(val?: number | null, decimals: number = 1): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `${val.toFixed(decimals)}%`;
}

export function formatPeriodTime(period: number): string {
  // Period 1 = 00:00 - 00:30, Period 48 = 23:30 - 00:00
  const totalMinutes = (period - 1) * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const startStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return `SP ${period} (${startStr})`;
}
