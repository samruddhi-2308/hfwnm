"""
Mathematical metrics engine for wind forecast evaluation.

Pure functions implementing institutional-grade accuracy formulas:
- Signed Error: actual - forecast
- MAE, RMSE, MBE (Bias), nMAE
- MAPE with capacity floor (default 100 MW)
- Empirical error distribution quantiles (P5, P10, ..., P95)
"""
from __future__ import annotations

from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd


def calculate_signed_error(actual: np.ndarray | pd.Series, forecast: np.ndarray | pd.Series) -> np.ndarray:
    """Calculate signed error: actual - forecast.

    Positive (> 0) = Wind over-delivered (system long)
    Negative (< 0) = Wind shortfall (system short)
    """
    act = np.asarray(actual, dtype=np.float64)
    fc = np.asarray(forecast, dtype=np.float64)
    return act - fc


def calculate_mae(actual: np.ndarray | pd.Series, forecast: np.ndarray | pd.Series) -> float:
    """Calculate Mean Absolute Error (MW)."""
    err = calculate_signed_error(actual, forecast)
    if len(err) == 0:
        return 0.0
    return float(np.mean(np.abs(err)))


def calculate_rmse(actual: np.ndarray | pd.Series, forecast: np.ndarray | pd.Series) -> float:
    """Calculate Root Mean Squared Error (MW)."""
    err = calculate_signed_error(actual, forecast)
    if len(err) == 0:
        return 0.0
    return float(np.sqrt(np.mean(err ** 2)))


def calculate_bias(actual: np.ndarray | pd.Series, forecast: np.ndarray | pd.Series) -> float:
    """Calculate Mean Bias Error / MBE (MW)."""
    err = calculate_signed_error(actual, forecast)
    if len(err) == 0:
        return 0.0
    return float(np.mean(err))


def calculate_nmae(actual: np.ndarray | pd.Series, forecast: np.ndarray | pd.Series) -> float:
    """Calculate Normalized MAE: MAE / mean(actual)."""
    act = np.asarray(actual, dtype=np.float64)
    if len(act) == 0:
        return 0.0
    mean_act = float(np.mean(act))
    if mean_act == 0.0:
        return 0.0
    mae = calculate_mae(act, forecast)
    return float(mae / mean_act)


def calculate_mape(
    actual: np.ndarray | pd.Series,
    forecast: np.ndarray | pd.Series,
    floor_mw: float = 100.0,
) -> float:
    """Calculate Mean Absolute Percentage Error (MAPE) with a minimum capacity floor.

    Filters out observations where actual < floor_mw to prevent explosive divisions
    during low-wind or calm periods. Returns percentage (0-100%).
    """
    act = np.asarray(actual, dtype=np.float64)
    fc = np.asarray(forecast, dtype=np.float64)
    mask = act >= floor_mw
    if not np.any(mask):
        return 0.0
    valid_act = act[mask]
    valid_fc = fc[mask]
    pct_errs = np.abs(valid_act - valid_fc) / valid_act
    return float(np.mean(pct_errs) * 100.0)


def calculate_quantiles(
    errors: np.ndarray | pd.Series,
    quantiles: Optional[List[float]] = None,
) -> Dict[str, float]:
    """Calculate empirical quantiles of signed error distribution."""
    if quantiles is None:
        quantiles = [0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95]

    err = np.asarray(errors, dtype=np.float64)
    err = err[~np.isnan(err)]
    if len(err) == 0:
        return {f"p{int(q*100)}": 0.0 for q in quantiles}

    res: Dict[str, float] = {}
    for q in quantiles:
        key = f"p{int(q*100)}"
        res[key] = float(np.quantile(err, q))
    return res


def calculate_metrics_summary(
    actual: np.ndarray | pd.Series,
    forecast: np.ndarray | pd.Series,
    floor_mw: float = 100.0,
) -> Dict[str, Any]:
    """Calculate a complete accuracy metrics dictionary."""
    act = np.asarray(actual, dtype=np.float64)
    fc = np.asarray(forecast, dtype=np.float64)
    n = len(act)
    if n == 0:
        return {
            "total_samples": 0,
            "mean_actual_mw": 0.0,
            "mean_forecast_mw": 0.0,
            "mae_mw": 0.0,
            "rmse_mw": 0.0,
            "bias_mw": 0.0,
            "nmae": 0.0,
            "mape_pct": 0.0,
            "quantiles": calculate_quantiles(np.array([])),
        }

    err = calculate_signed_error(act, fc)
    return {
        "total_samples": int(n),
        "mean_actual_mw": round(float(np.mean(act)), 2),
        "mean_forecast_mw": round(float(np.mean(fc)), 2),
        "mae_mw": round(calculate_mae(act, fc), 2),
        "rmse_mw": round(calculate_rmse(act, fc), 2),
        "bias_mw": round(calculate_bias(act, fc), 2),
        "nmae": round(calculate_nmae(act, fc), 4),
        "mape_pct": round(calculate_mape(act, fc, floor_mw=floor_mw), 2),
        "quantiles": {k: round(v, 2) for k, v in calculate_quantiles(err).items()},
    }


def calculate_metrics_by_horizon(
    paired_df: pd.DataFrame,
    bucket_hours: float = 1.0,
    max_horizon_hours: float = 48.0,
) -> List[Dict[str, Any]]:
    """Group paired observations by lead time horizon bucket and compute metrics.

    Args:
        paired_df: DataFrame with 'horizon_hours', 'actual_mw', 'forecast_mw'
        bucket_hours: Bucket step in hours (e.g. 1.0h, 2.0h, 4.0h)
        max_horizon_hours: Upper bound for horizon analysis

    Returns:
        List of dicts with horizon_hours, mae_mw, rmse_mw, bias_mw, n_samples
    """
    if paired_df.empty:
        return []

    df = paired_df.copy()
    # Filter valid range
    df = df[(df["horizon_hours"] >= 0) & (df["horizon_hours"] <= max_horizon_hours)]
    if df.empty:
        return []

    # Bin horizon into buckets: 1.0, 2.0, 3.0, etc.
    # Ceiling / right-closed binning or round to nearest bucket step
    df["bucket"] = (np.ceil(df["horizon_hours"] / bucket_hours) * bucket_hours).astype(float)
    # Set 0 to minimum bucket_hours
    df.loc[df["bucket"] == 0, "bucket"] = bucket_hours

    results: List[Dict[str, Any]] = []
    for bucket_val, group in df.groupby("bucket"):
        if group.empty:
            continue
        act = group["actual_mw"].to_numpy()
        fc = group["forecast_mw"].to_numpy()
        results.append({
            "horizon_hours": round(float(bucket_val), 1),
            "mae_mw": round(calculate_mae(act, fc), 2),
            "rmse_mw": round(calculate_rmse(act, fc), 2),
            "bias_mw": round(calculate_bias(act, fc), 2),
            "n_samples": int(len(group)),
        })

    results.sort(key=lambda x: x["horizon_hours"])
    return results


def calculate_daily_timeseries_accuracy(paired_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Calculate daily accuracy breakdown across delivery days."""
    if paired_df.empty:
        return []

    df = paired_df.copy()
    if "settlement_date" not in df.columns:
        df["settlement_date"] = df["start_time_utc"].dt.strftime("%Y-%m-%d")

    results: List[Dict[str, Any]] = []
    for date_str, group in df.groupby("settlement_date"):
        act = group["actual_mw"].to_numpy()
        fc = group["forecast_mw"].to_numpy()
        # Half hours = 0.5 MWh per MW
        act_mwh = float(np.sum(act) * 0.5)
        fc_mwh = float(np.sum(fc) * 0.5)
        results.append({
            "date": str(date_str),
            "mae_mw": round(calculate_mae(act, fc), 2),
            "rmse_mw": round(calculate_rmse(act, fc), 2),
            "bias_mw": round(calculate_bias(act, fc), 2),
            "actual_mwh": round(act_mwh, 1),
            "forecast_mwh": round(fc_mwh, 1),
            "sample_count": int(len(group)),
        })

    results.sort(key=lambda x: x["date"])
    return results
