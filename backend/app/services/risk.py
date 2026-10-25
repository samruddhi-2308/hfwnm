"""
Leave-One-Day-Out (LODO) Wind Risk Buffer & Confidence Bound Engine.

Calculates empirical downside (P10) and upside (P90) error bounds for delivery Day D
using ONLY training data from other January days (d != D), guaranteeing zero look-ahead leakage.
"""
from __future__ import annotations

from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd

from app.config import settings


def compute_lodo_risk_bounds(
    day_periods_df: pd.DataFrame,
    all_paired_df: pd.DataFrame,
    delivery_date_str: str,
    spread_gbp_per_mwh: float = 85.0,
) -> Tuple[pd.DataFrame, Dict[str, float]]:
    """Calculate empirical P10 and P90 confidence bounds and risk buffers using LODO cross-validation.

    Args:
        day_periods_df: DataFrame with selected day-ahead forecasts for Day D (48 periods)
        all_paired_df: Full historical paired DataFrame containing all January actuals & forecasts
        delivery_date_str: Delivery date Day D (YYYY-MM-DD) to EXCLUDE from training
        spread_gbp_per_mwh: Benchmark imbalance price spread proxy (£/MWh)

    Returns:
        Tuple of (enriched_periods_df, daily_risk_summary)
    """
    df = day_periods_df.copy()
    hist = all_paired_df.copy()

    # Ensure settlement_date is present in hist
    if "settlement_date" not in hist.columns:
        hist["settlement_date"] = hist["start_time_utc"].dt.strftime("%Y-%m-%d")

    # Strictly exclude Day D from training set (Zero leakage)
    train_df = hist[hist["settlement_date"] != delivery_date_str].copy()

    # Pre-calculate global training quantiles as robust fallback
    train_errors = train_df["error_mw"].dropna().to_numpy()
    if len(train_errors) > 0:
        global_p10 = float(np.quantile(train_errors, 0.10))
        global_p90 = float(np.quantile(train_errors, 0.90))
    else:
        # Conservative defaults if no history
        global_p10 = -1500.0
        global_p90 = 1500.0

    # Ensure settlement_period exists in training set
    if "settlement_period" not in train_df.columns:
        # Derive settlement period from start_time_utc: (hour * 2 + minute // 30) + 1
        train_df["settlement_period"] = (
            train_df["start_time_utc"].dt.hour * 2 + train_df["start_time_utc"].dt.minute // 30 + 1
        )

    # Compute period-stratified empirical quantiles across training days
    period_quantiles: Dict[int, Tuple[float, float]] = {}
    for period, group in train_df.groupby("settlement_period"):
        errs = group["error_mw"].dropna().to_numpy()
        if len(errs) >= 10:
            p10 = float(np.quantile(errs, 0.10))
            p90 = float(np.quantile(errs, 0.90))
        else:
            p10, p90 = global_p10, global_p90
        period_quantiles[int(period)] = (p10, p90)

    # Apply quantiles to each period on Day D
    p10_bounds = []
    p90_bounds = []
    risk_buffers = []

    for _, row in df.iterrows():
        p = int(row["settlement_period"])
        fc = float(row["forecast_mw"])

        p10_err, p90_err = period_quantiles.get(p, (global_p10, global_p90))

        # Downside P10 lower bound: forecast + negative error quantile
        # Clamped so it doesn't exceed forecast and doesn't drop below 0
        p10_lower = min(fc, max(0.0, fc + p10_err))
        # Upside P90 upper bound: forecast + positive error quantile
        # Clamped so it doesn't drop below forecast
        p90_upper = max(fc, max(0.0, fc + p90_err))

        # Recommended risk buffer (MW needed as backup/thermal hedge):
        # Buffer = forecast - p10_lower = |p10_err|
        buffer_mw = max(0.0, fc - p10_lower)

        p10_bounds.append(round(p10_lower, 2))
        p90_bounds.append(round(p90_upper, 2))
        risk_buffers.append(round(buffer_mw, 2))

    df["p10_lower_bound_mw"] = p10_bounds
    df["p90_upper_bound_mw"] = p90_bounds
    df["risk_buffer_mw"] = risk_buffers

    # Aggregate day summary metrics
    forecast_mw_arr = df["forecast_mw"].to_numpy()
    total_forecast_mwh = round(float(np.sum(forecast_mw_arr) * 0.5), 1)
    peak_forecast_mw = round(float(np.max(forecast_mw_arr)), 1)
    min_forecast_mw = round(float(np.min(forecast_mw_arr)), 1)

    avg_recommended_buffer_mw = round(float(np.mean(risk_buffers)), 1)
    # Downside financial exposure: sum(buffer_mw * 0.5h * spread_gbp)
    total_downside_exposure_gbp = round(
        float(np.sum(np.array(risk_buffers) * 0.5 * spread_gbp_per_mwh)), 2
    )

    summary: Dict[str, float] = {
        "total_forecast_mwh": total_forecast_mwh,
        "peak_forecast_mw": peak_forecast_mw,
        "min_forecast_mw": min_forecast_mw,
        "recommended_risk_buffer_mw": avg_recommended_buffer_mw,
        "downside_financial_exposure_gbp": total_downside_exposure_gbp,
    }

    # If actuals are present, add actual MWh, MAE, and Bias
    if "actual_mw" in df.columns and df["actual_mw"].notna().any():
        valid = df.dropna(subset=["actual_mw", "forecast_mw"])
        act = valid["actual_mw"].to_numpy()
        fc = valid["forecast_mw"].to_numpy()
        summary["actual_mwh"] = round(float(np.sum(act) * 0.5), 1)
        summary["day_mae_mw"] = round(float(np.mean(np.abs(act - fc))), 2)
        summary["day_bias_mw"] = round(float(np.mean(act - fc)), 2)
    else:
        summary["actual_mwh"] = None
        summary["day_mae_mw"] = None
        summary["day_bias_mw"] = None

    return df, summary
