"""
Pydantic v2 schemas for the UK Wind Forecast Monitoring & Decision Portal API.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


# --- Day-Ahead Forecast Models ---

class DayAheadPeriod(BaseModel):
    """Single half-hour settlement period forecast and risk bounds."""
    settlement_period: int = Field(..., ge=1, le=50, description="Settlement period (1-48, or 50 on clock change)")
    start_time_utc: datetime = Field(..., description="Target settlement half-hour start timestamp in UTC")
    publish_time_utc: datetime = Field(..., description="Timestamp when the selected forecast was published")
    horizon_hours: float = Field(..., description="Lead time in hours between publish time and target start")
    forecast_mw: float = Field(..., description="Forecasted national wind generation in MW")
    p10_lower_bound_mw: float = Field(..., description="P10 empirical downside risk bound in MW")
    p90_upper_bound_mw: float = Field(..., description="P90 empirical upside bound in MW")
    actual_mw: Optional[float] = Field(None, description="Actual outturn generation in MW (if available)")
    error_mw: Optional[float] = Field(None, description="Signed error = actual - forecast in MW")


class DayAheadSummary(BaseModel):
    """Aggregate daily metrics and operational recommendations."""
    total_forecast_mwh: float = Field(..., description="Total forecasted energy for delivery day in MWh")
    peak_forecast_mw: float = Field(..., description="Maximum forecasted half-hourly generation in MW")
    min_forecast_mw: float = Field(..., description="Minimum forecasted half-hourly generation in MW")
    recommended_risk_buffer_mw: float = Field(..., description="Average recommended thermal hedge buffer in MW")
    downside_financial_exposure_gbp: float = Field(..., description="Total daily downside financial imbalance exposure in £")
    actual_mwh: Optional[float] = Field(None, description="Total outturn energy in MWh")
    day_mae_mw: Optional[float] = Field(None, description="Mean Absolute Error across the day in MW")
    day_bias_mw: Optional[float] = Field(None, description="Mean Bias Error across the day in MW")


class DayAheadResponse(BaseModel):
    """Response payload for day-ahead cutoff forecast endpoint."""
    delivery_date: str = Field(..., description="Target delivery date (YYYY-MM-DD)")
    cutoff_applied_utc: str = Field(..., description="Effective cutoff timestamp in UTC")
    cutoff_time_uk: str = Field(..., description="Cutoff time in Europe/London timezone (e.g. 09:00)")
    summary: DayAheadSummary
    periods: List[DayAheadPeriod]


# --- Multi-Vintage Forecast Models ---

class ForecastVintageItem(BaseModel):
    """Single published forecast vintage for a given settlement period."""
    publish_time_utc: datetime
    horizon_hours: float
    forecast_mw: float


class VintagesResponse(BaseModel):
    """Forecast evolution over lead times for a specific settlement period."""
    delivery_date: str
    settlement_period: int
    start_time_utc: datetime
    actual_mw: Optional[float] = None
    vintages: List[ForecastVintageItem]


# --- Accuracy & Metrics Models ---

class HorizonBucket(BaseModel):
    """Forecast accuracy aggregated by lead time horizon bucket."""
    horizon_hours: float = Field(..., description="Horizon bucket midpoint or upper bound in hours")
    mae_mw: float = Field(..., description="Mean Absolute Error in MW")
    rmse_mw: float = Field(..., description="Root Mean Squared Error in MW")
    bias_mw: float = Field(..., description="Mean Bias Error (actual - forecast) in MW")
    n_samples: int = Field(..., description="Number of matched forecast-actual observations")


class HorizonAccuracyResponse(BaseModel):
    """Accuracy metrics grouped across the 0-48h forecast lead time horizon."""
    buckets: List[HorizonBucket]


class AccuracySummaryResponse(BaseModel):
    """Overall dataset mathematical accuracy KPIs."""
    total_samples: int
    mean_actual_mw: float
    mean_forecast_mw: float
    mae_mw: float
    rmse_mw: float
    bias_mw: float
    nmae: float = Field(..., description="Normalized MAE = MAE / mean_actual")
    mape_pct: float = Field(..., description="MAPE with capacity floor applied (percentage)")
    quantiles: Dict[str, float] = Field(..., description="Empirical quantiles of signed error (P5, P10, ..., P95)")


class TimeseriesAccuracyPoint(BaseModel):
    """Daily aggregated accuracy metrics for timeseries visualization."""
    date: str = Field(..., description="Settlement date (YYYY-MM-DD)")
    mae_mw: float
    rmse_mw: float
    bias_mw: float
    forecast_mwh: float
    actual_mwh: float
    sample_count: int


class TimeseriesAccuracyResponse(BaseModel):
    """Timeseries accuracy trajectory over the January 2026 monitoring window."""
    points: List[TimeseriesAccuracyPoint]


# --- Metadata & Health Models ---

class MetaResponse(BaseModel):
    """System health, coverage audit, and dataset snapshot metadata."""
    dataset_health: str = Field(..., description="'HEALTHY', 'DEGRADED', or 'INCOMPLETE'")
    total_actual_records: int
    total_forecast_records: int
    total_paired_records: int
    january_periods_actual: int
    january_completeness_pct: float
    missing_intervals: List[str]
    last_build_timestamp: Optional[str]
