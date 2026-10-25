"""
Day-Ahead Cutoff Selection Engine.

Selects the latest wind forecast vintage available on or before a specified
gate-closure cutoff time on D-1 for every settlement period on delivery day D.
Enforces strict zero look-ahead bias and handles hourly to half-hourly settlement mapping.
"""
from __future__ import annotations

from datetime import datetime, date, timedelta
from typing import Tuple, Optional
import zoneinfo
import numpy as np
import pandas as pd


def compute_cutoff_utc(delivery_date_str: str, cutoff_time_uk: str = "09:00") -> datetime:
    """Compute the UTC cutoff timestamp for auction gate closure on D-1.

    Args:
        delivery_date_str: Delivery date YYYY-MM-DD (Day D)
        cutoff_time_uk: Cutoff time in Europe/London timezone, e.g. "09:00"

    Returns:
        Timezone-aware datetime in UTC
    """
    delivery_d = date.fromisoformat(delivery_date_str)
    day_minus_1 = delivery_d - timedelta(days=1)

    parts = cutoff_time_uk.strip().split(":")
    hour = int(parts[0])
    minute = int(parts[1]) if len(parts) > 1 else 0

    tz_uk = zoneinfo.ZoneInfo("Europe/London")
    dt_local = datetime(
        day_minus_1.year,
        day_minus_1.month,
        day_minus_1.day,
        hour,
        minute,
        tzinfo=tz_uk,
    )
    return dt_local.astimezone(zoneinfo.ZoneInfo("UTC"))


def select_dayahead_forecasts(
    forecasts_df: pd.DataFrame,
    actuals_df: pd.DataFrame,
    delivery_date_str: str,
    cutoff_time_uk: str = "09:00",
    include_actuals: bool = True,
) -> Tuple[pd.DataFrame, datetime]:
    """Select the latest forecast vintage published on or before the cutoff on D-1.

    Maps half-hour settlement periods to the operative forecast vintage for that hour.

    Args:
        forecasts_df: DataFrame with ['start_time_utc', 'publish_time_utc', 'horizon_hours', 'forecast_mw']
        actuals_df: DataFrame with ['start_time_utc', 'settlement_date', 'settlement_period', 'actual_mw']
        delivery_date_str: Target delivery date Day D (YYYY-MM-DD)
        cutoff_time_uk: Gate closure time on D-1 (e.g. "09:00")
        include_actuals: Whether to join actual outturn values

    Returns:
        Tuple of (selected_periods_df, cutoff_utc)
    """
    cutoff_utc = compute_cutoff_utc(delivery_date_str, cutoff_time_uk)

    # Filter actuals for Day D
    day_actuals = actuals_df[actuals_df["settlement_date"] == delivery_date_str].copy()
    if day_actuals.empty:
        start_bound = pd.Timestamp(f"{delivery_date_str} 00:00:00", tz="UTC")
        end_bound = pd.Timestamp(f"{delivery_date_str} 23:59:59", tz="UTC")
        day_actuals = actuals_df[
            (actuals_df["start_time_utc"] >= start_bound) &
            (actuals_df["start_time_utc"] <= end_bound)
        ].copy()

    day_actuals = day_actuals.sort_values("start_time_utc").reset_index(drop=True)

    # In Elexon BMRS, WINDFOR forecasts are published hourly (00:00, 01:00, ...).
    # Actuals are half-hourly (periods 1..48).
    # Map each half-hour settlement period to its operative hour:
    day_actuals["hour_start_utc"] = day_actuals["start_time_utc"].dt.floor("h")

    target_hour_times = set(day_actuals["hour_start_utc"])

    # Strictly enforce: publish_time_utc <= cutoff_utc (Zero look-ahead)
    candidate_fc = forecasts_df[
        (forecasts_df["start_time_utc"].isin(target_hour_times)) &
        (forecasts_df["publish_time_utc"] <= cutoff_utc)
    ].copy()

    if not candidate_fc.empty:
        # Sort by start_time_utc and publish_time_utc ascending, then take the last record per hour
        candidate_fc = candidate_fc.sort_values(["start_time_utc", "publish_time_utc"])
        selected_fc = candidate_fc.groupby("start_time_utc", as_index=False).last()
        selected_fc = selected_fc.rename(columns={"start_time_utc": "hour_start_utc"})
    else:
        selected_fc = pd.DataFrame(columns=["hour_start_utc", "publish_time_utc", "forecast_mw"])

    # Merge each half-hour with the operative forecast
    merged = pd.merge(
        day_actuals[["start_time_utc", "hour_start_utc", "settlement_date", "settlement_period", "actual_mw"]],
        selected_fc[["hour_start_utc", "publish_time_utc", "forecast_mw"]],
        on="hour_start_utc",
        how="left",
    )

    # If any periods lacked a pre-cutoff forecast, forward/back fill
    if merged["forecast_mw"].isna().any():
        merged["forecast_mw"] = merged["forecast_mw"].bfill().ffill()
    if merged["publish_time_utc"].isna().any():
        merged["publish_time_utc"] = merged["publish_time_utc"].bfill().ffill()

    # Re-calculate horizon_hours accurately for each half-hour
    merged["horizon_hours"] = (
        (merged["start_time_utc"] - merged["publish_time_utc"]).dt.total_seconds() / 3600.0
    ).round(2)

    # Calculate signed error: actual - forecast
    if include_actuals:
        merged["error_mw"] = (merged["actual_mw"] - merged["forecast_mw"]).round(2)
    else:
        merged["actual_mw"] = np.nan
        merged["error_mw"] = np.nan

    merged = merged.drop(columns=["hour_start_utc"])
    merged = merged.sort_values("settlement_period").reset_index(drop=True)
    return merged, cutoff_utc
