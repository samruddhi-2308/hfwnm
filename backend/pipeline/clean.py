"""
Data Cleaning & Transformation Pipeline.

Takes raw FUELHH and WINDFOR JSON records from the ingestion step and produces
cleaned, validated, and paired DataFrames ready for Parquet serialization.

Cleaning rules (each documented and counted):
1. Parse all timestamps as UTC-aware datetimes.
2. Filter FUELHH to fuelType == "WIND" only.
3. Deduplicate on (startTime, publishTime) for forecasts and (startTime) for actuals.
4. Compute horizon_hours = (startTime - publishTime) / 3600.
5. Drop rows with horizon < 0 (published after target) or horizon > 48.
6. Flag/drop negative or null generation values.
7. Pair forecasts with actuals on startTime via inner join.
8. Compute signed error, absolute error, and percentage error.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

# January 2026 target window for analysis
JAN_2026_START = pd.Timestamp("2026-01-01T00:00:00", tz="UTC")
JAN_2026_END = pd.Timestamp("2026-01-31T23:30:00", tz="UTC")

# Configurable limits
MAX_HORIZON_HOURS = 48.0
MAPE_ACTUAL_FLOOR_MW = 100.0  # Minimum actual MW to include in MAPE calculation


@dataclass
class CleaningReport:
    """Tracks counts of records dropped at each cleaning step."""
    raw_fuelhh_total: int = 0
    fuelhh_non_wind_dropped: int = 0
    fuelhh_duplicates_dropped: int = 0
    fuelhh_negative_gen_dropped: int = 0
    fuelhh_null_gen_dropped: int = 0
    actuals_final: int = 0

    raw_windfor_total: int = 0
    windfor_duplicates_dropped: int = 0
    windfor_negative_horizon_dropped: int = 0
    windfor_over_horizon_dropped: int = 0
    windfor_negative_gen_dropped: int = 0
    windfor_null_gen_dropped: int = 0
    windfor_outside_jan_dropped: int = 0
    forecasts_final: int = 0

    paired_count: int = 0
    january_periods_expected: int = 31 * 48  # 1488
    january_periods_actual: int = 0
    missing_periods: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "actuals": {
                "raw_total": self.raw_fuelhh_total,
                "non_wind_dropped": self.fuelhh_non_wind_dropped,
                "duplicates_dropped": self.fuelhh_duplicates_dropped,
                "negative_generation_dropped": self.fuelhh_negative_gen_dropped,
                "null_generation_dropped": self.fuelhh_null_gen_dropped,
                "final_count": self.actuals_final,
            },
            "forecasts": {
                "raw_total": self.raw_windfor_total,
                "duplicates_dropped": self.windfor_duplicates_dropped,
                "negative_horizon_dropped": self.windfor_negative_horizon_dropped,
                "over_horizon_dropped": self.windfor_over_horizon_dropped,
                "negative_generation_dropped": self.windfor_negative_gen_dropped,
                "null_generation_dropped": self.windfor_null_gen_dropped,
                "outside_january_dropped": self.windfor_outside_jan_dropped,
                "final_count": self.forecasts_final,
            },
            "pairing": {
                "paired_count": self.paired_count,
                "january_periods_expected": self.january_periods_expected,
                "january_periods_covered": self.january_periods_actual,
                "missing_periods": self.missing_periods[:20],  # Cap for readability
            },
        }


def clean_actuals(raw_records: list[dict[str, Any]], report: CleaningReport) -> pd.DataFrame:
    """
    Clean raw FUELHH records into a validated actuals DataFrame.

    Steps:
    1. Filter to fuelType == "WIND"
    2. Parse startTime as UTC datetime
    3. Deduplicate on startTime (keep last)
    4. Drop null/negative generation
    5. Filter to January 2026 target window

    Returns:
        DataFrame with columns: start_time_utc, settlement_date, settlement_period, actual_mw
    """
    report.raw_fuelhh_total = len(raw_records)
    df = pd.DataFrame(raw_records)

    if df.empty:
        logger.warning("No FUELHH records received")
        return pd.DataFrame(columns=["start_time_utc", "settlement_date", "settlement_period", "actual_mw"])

    # Step 1: Filter to wind only
    before = len(df)
    df = df[df["fuelType"] == "WIND"].copy()
    report.fuelhh_non_wind_dropped = before - len(df)
    logger.info(f"  Actuals: filtered to WIND -> {len(df)} records ({report.fuelhh_non_wind_dropped} non-wind dropped)")

    # Step 2: Parse timestamps
    df["start_time_utc"] = pd.to_datetime(df["startTime"], utc=True)

    # Step 3: Deduplicate on startTime
    before = len(df)
    df = df.drop_duplicates(subset=["start_time_utc"], keep="last")
    report.fuelhh_duplicates_dropped = before - len(df)
    logger.info(f"  Actuals: deduped -> {len(df)} records ({report.fuelhh_duplicates_dropped} duplicates dropped)")

    # Step 4: Handle null/negative generation
    before = len(df)
    null_mask = df["generation"].isna()
    report.fuelhh_null_gen_dropped = int(null_mask.sum())
    df = df[~null_mask]
    neg_mask = df["generation"] < 0
    report.fuelhh_negative_gen_dropped = int(neg_mask.sum())
    df = df[~neg_mask]
    logger.info(
        f"  Actuals: cleaned generation -> {len(df)} records "
        f"({report.fuelhh_null_gen_dropped} null, {report.fuelhh_negative_gen_dropped} negative dropped)"
    )

    # Step 5: Filter to January 2026
    df = df[(df["start_time_utc"] >= JAN_2026_START) & (df["start_time_utc"] <= JAN_2026_END)]

    # Build final DataFrame
    result = pd.DataFrame({
        "start_time_utc": df["start_time_utc"],
        "settlement_date": df.get("settlementDate", df["start_time_utc"].dt.strftime("%Y-%m-%d")),
        "settlement_period": df.get("settlementPeriod", range(1, len(df) + 1)),
        "actual_mw": df["generation"].astype(float),
    })
    result = result.sort_values("start_time_utc").reset_index(drop=True)
    report.actuals_final = len(result)

    # Audit January coverage
    expected_times = pd.date_range(start=JAN_2026_START, end=JAN_2026_END, freq="30min", tz="UTC")
    covered = set(result["start_time_utc"])
    missing = [str(t) for t in expected_times if t not in covered]
    report.january_periods_actual = len(covered)
    report.missing_periods = missing

    logger.info(
        f"  Actuals final: {report.actuals_final} records, "
        f"January coverage: {report.january_periods_actual}/{report.january_periods_expected}"
    )

    return result


def clean_forecasts(raw_records: list[dict[str, Any]], report: CleaningReport) -> pd.DataFrame:
    """
    Clean raw WINDFOR records into a validated forecasts DataFrame.

    Steps:
    1. Parse startTime and publishTime as UTC datetimes
    2. Compute horizon_hours
    3. Drop negative horizon (forecast published after target)
    4. Drop horizon > MAX_HORIZON_HOURS
    5. Deduplicate on (startTime, publishTime)
    6. Drop null/negative generation
    7. Filter to startTimes within January 2026

    Returns:
        DataFrame with columns: start_time_utc, publish_time_utc, horizon_hours, forecast_mw
    """
    report.raw_windfor_total = len(raw_records)
    df = pd.DataFrame(raw_records)

    if df.empty:
        logger.warning("No WINDFOR records received")
        return pd.DataFrame(columns=["start_time_utc", "publish_time_utc", "horizon_hours", "forecast_mw"])

    # Step 1: Parse timestamps
    df["start_time_utc"] = pd.to_datetime(df["startTime"], utc=True)
    df["publish_time_utc"] = pd.to_datetime(df["publishTime"], utc=True)

    # Step 2: Compute horizon
    df["horizon_hours"] = (
        (df["start_time_utc"] - df["publish_time_utc"]).dt.total_seconds() / 3600.0
    )

    # Step 3: Drop negative horizon
    before = len(df)
    df = df[df["horizon_hours"] >= 0]
    report.windfor_negative_horizon_dropped = before - len(df)
    logger.info(f"  Forecasts: dropped {report.windfor_negative_horizon_dropped} negative-horizon records")

    # Step 4: Drop over-horizon
    before = len(df)
    df = df[df["horizon_hours"] <= MAX_HORIZON_HOURS]
    report.windfor_over_horizon_dropped = before - len(df)
    logger.info(f"  Forecasts: dropped {report.windfor_over_horizon_dropped} over-{MAX_HORIZON_HOURS}h-horizon records")

    # Step 5: Deduplicate
    before = len(df)
    df = df.drop_duplicates(subset=["start_time_utc", "publish_time_utc"], keep="last")
    report.windfor_duplicates_dropped = before - len(df)
    logger.info(f"  Forecasts: deduped -> {len(df)} ({report.windfor_duplicates_dropped} duplicates dropped)")

    # Step 6: Handle null/negative generation
    null_mask = df["generation"].isna()
    report.windfor_null_gen_dropped = int(null_mask.sum())
    df = df[~null_mask]
    neg_mask = df["generation"] < 0
    report.windfor_negative_gen_dropped = int(neg_mask.sum())
    df = df[~neg_mask]
    logger.info(
        f"  Forecasts: cleaned generation -> {len(df)} "
        f"({report.windfor_null_gen_dropped} null, {report.windfor_negative_gen_dropped} negative dropped)"
    )

    # Step 7: Filter to January 2026 target times
    before = len(df)
    df = df[(df["start_time_utc"] >= JAN_2026_START) & (df["start_time_utc"] <= JAN_2026_END)]
    report.windfor_outside_jan_dropped = before - len(df)
    logger.info(f"  Forecasts: filtered to January -> {len(df)} ({report.windfor_outside_jan_dropped} outside Jan dropped)")

    # Build final DataFrame
    result = pd.DataFrame({
        "start_time_utc": df["start_time_utc"],
        "publish_time_utc": df["publish_time_utc"],
        "horizon_hours": df["horizon_hours"].astype(float),
        "forecast_mw": df["generation"].astype(float),
    })
    result = result.sort_values(["start_time_utc", "publish_time_utc"]).reset_index(drop=True)
    report.forecasts_final = len(result)

    logger.info(f"  Forecasts final: {report.forecasts_final} records")

    return result


def pair_forecasts_with_actuals(
    actuals: pd.DataFrame,
    forecasts: pd.DataFrame,
    report: CleaningReport,
) -> pd.DataFrame:
    """
    Inner join forecasts with actuals on start_time_utc to create
    matched pairs with error calculations.

    Returns:
        DataFrame with columns: start_time_utc, publish_time_utc, horizon_hours,
        forecast_mw, actual_mw, error_mw, abs_error_mw, pct_error
    """
    paired = forecasts.merge(
        actuals[["start_time_utc", "actual_mw"]],
        on="start_time_utc",
        how="inner",
    )

    # Compute errors
    # Error = actual - forecast (positive = wind over-delivered, negative = shortfall)
    paired["error_mw"] = paired["actual_mw"] - paired["forecast_mw"]
    paired["abs_error_mw"] = paired["error_mw"].abs()

    # Percentage error (guarded against near-zero actuals)
    paired["pct_error"] = paired.apply(
        lambda row: (
            abs(row["error_mw"]) / row["actual_mw"] * 100.0
            if row["actual_mw"] >= MAPE_ACTUAL_FLOOR_MW
            else None
        ),
        axis=1,
    )

    paired = paired.sort_values(["start_time_utc", "publish_time_utc"]).reset_index(drop=True)
    report.paired_count = len(paired)

    logger.info(f"  Paired records: {report.paired_count}")

    return paired
