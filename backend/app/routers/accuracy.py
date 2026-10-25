"""
Accuracy and evaluation routers for the UK Wind Forecast Portal.

Endpoints:
- GET /api/v1/accuracy/summary: Overall KPI metrics (MAE, RMSE, Bias, nMAE, MAPE, quantiles)
- GET /api/v1/accuracy/by-horizon: Error dynamics grouped by forecast lead time (0-48h decay)
- GET /api/v1/accuracy/timeseries: Daily time-series breakdown of errors across January
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Query
import pandas as pd

from app.config import settings
from app.data_store import store
from app.schemas import (
    AccuracySummaryResponse,
    HorizonAccuracyResponse,
    HorizonBucket,
    TimeseriesAccuracyResponse,
    TimeseriesAccuracyPoint,
)
from app.services.metrics import (
    calculate_metrics_summary,
    calculate_metrics_by_horizon,
    calculate_daily_timeseries_accuracy,
)

router = APIRouter(prefix="/accuracy", tags=["Accuracy"])


def _filter_paired(
    paired_df: pd.DataFrame,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_horizon: Optional[float] = None,
    max_horizon: Optional[float] = None,
) -> pd.DataFrame:
    """Helper to apply standard query filters to paired DataFrame."""
    df = paired_df.copy()

    if "settlement_date" not in df.columns:
        df["settlement_date"] = df["start_time_utc"].dt.strftime("%Y-%m-%d")

    if start_date:
        df = df[df["settlement_date"] >= start_date]
    if end_date:
        df = df[df["settlement_date"] <= end_date]
    if min_horizon is not None:
        df = df[df["horizon_hours"] >= min_horizon]
    if max_horizon is not None:
        df = df[df["horizon_hours"] <= max_horizon]

    return df


@router.get("/summary", response_model=AccuracySummaryResponse)
def get_accuracy_summary(
    start_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="End date filter (YYYY-MM-DD)"),
    min_horizon: Optional[float] = Query(None, ge=0.0, le=48.0, description="Minimum horizon hours (e.g. 0.0)"),
    max_horizon: Optional[float] = Query(None, ge=0.0, le=48.0, description="Maximum horizon hours (e.g. 48.0)"),
):
    """Compute aggregate accuracy metrics across paired observations with optional date & horizon filters."""
    paired_df = store.get_paired()
    filtered = _filter_paired(paired_df, start_date, end_date, min_horizon, max_horizon)

    summary = calculate_metrics_summary(
        actual=filtered["actual_mw"].to_numpy(),
        forecast=filtered["forecast_mw"].to_numpy(),
        floor_mw=settings.mape_capacity_floor_mw,
    )
    return AccuracySummaryResponse(**summary)


@router.get("/by-horizon", response_model=HorizonAccuracyResponse)
def get_accuracy_by_horizon(
    start_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    bucket_hours: float = Query(1.0, ge=0.5, le=12.0, description="Horizon binning step in hours"),
):
    """Examine horizon error decay dynamics: MAE, RMSE, and Bias grouped across 0-48h lead times."""
    paired_df = store.get_paired()
    filtered = _filter_paired(paired_df, start_date, end_date)

    raw_buckets = calculate_metrics_by_horizon(filtered, bucket_hours=bucket_hours)
    buckets = [HorizonBucket(**b) for b in raw_buckets]
    return HorizonAccuracyResponse(buckets=buckets)


@router.get("/timeseries", response_model=TimeseriesAccuracyResponse)
def get_accuracy_timeseries(
    start_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    min_horizon: Optional[float] = Query(None, ge=0.0, le=48.0),
    max_horizon: Optional[float] = Query(None, ge=0.0, le=48.0),
):
    """Retrieve daily accuracy and volume progression over time across the January monitoring window."""
    paired_df = store.get_paired()
    filtered = _filter_paired(paired_df, start_date, end_date, min_horizon, max_horizon)

    raw_points = calculate_daily_timeseries_accuracy(filtered)
    points = [TimeseriesAccuracyPoint(**p) for p in raw_points]
    return TimeseriesAccuracyResponse(points=points)
