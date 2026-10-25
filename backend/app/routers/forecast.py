"""
Forecast routers for the UK Wind Forecast Portal.

Endpoints:
- GET /api/v1/forecast/dayahead: Operational day-ahead auction cutoff forecast with LODO risk buffer
- GET /api/v1/forecast/vintages: Multi-vintage evolution over lead time for a specific settlement period
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
import pandas as pd

from app.config import settings
from app.data_store import store
from app.schemas import DayAheadResponse, DayAheadPeriod, DayAheadSummary, VintagesResponse, ForecastVintageItem
from app.services.selection import select_dayahead_forecasts
from app.services.risk import compute_lodo_risk_bounds

router = APIRouter(prefix="/forecast", tags=["Forecast"])


@router.get("/dayahead", response_model=DayAheadResponse)
def get_dayahead_forecast(
    delivery_date: str = Query(
        ...,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="Target delivery date (YYYY-MM-DD), e.g. 2026-01-15",
    ),
    cutoff_time: str = Query(
        "09:00",
        description="Cutoff time in UK local time (Europe/London) on D-1, e.g. '09:00'",
    ),
    include_actuals: bool = Query(
        True,
        description="Whether to join actual outturn and compute signed error",
    ),
):
    """Retrieve operational Day-Ahead wind forecast using strict gate-closure cutoff on D-1.

    Incorporates Leave-One-Day-Out (LODO) empirical risk buffers (P10/P90) and financial exposure.
    Guarantees zero look-ahead data leakage.
    """
    actuals_df = store.get_actuals()
    forecasts_df = store.get_forecasts()
    paired_df = store.get_paired()

    valid_dates = set(actuals_df["settlement_date"])
    if delivery_date not in valid_dates:
        raise HTTPException(
            status_code=404,
            detail=f"Delivery date {delivery_date} not found. Available dates: {sorted(list(valid_dates))[:5]}...",
        )

    # 1. Execute cutoff selection
    selected_df, cutoff_utc = select_dayahead_forecasts(
        forecasts_df=forecasts_df,
        actuals_df=actuals_df,
        delivery_date_str=delivery_date,
        cutoff_time_uk=cutoff_time,
        include_actuals=include_actuals,
    )

    if selected_df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No forecast data available for {delivery_date} prior to cutoff {cutoff_time} UK.",
        )

    # 2. Compute LODO risk bounds & downside financial buffer
    enriched_df, summary_dict = compute_lodo_risk_bounds(
        day_periods_df=selected_df,
        all_paired_df=paired_df,
        delivery_date_str=delivery_date,
        spread_gbp_per_mwh=settings.benchmark_imbalance_spread_gbp,
    )

    # 3. Format periods
    periods = []
    for _, row in enriched_df.iterrows():
        periods.append(
            DayAheadPeriod(
                settlement_period=int(row["settlement_period"]),
                start_time_utc=pd.to_datetime(row["start_time_utc"]).to_pydatetime(),
                publish_time_utc=pd.to_datetime(row["publish_time_utc"]).to_pydatetime(),
                horizon_hours=float(row["horizon_hours"]),
                forecast_mw=float(row["forecast_mw"]),
                p10_lower_bound_mw=float(row["p10_lower_bound_mw"]),
                p90_upper_bound_mw=float(row["p90_upper_bound_mw"]),
                actual_mw=float(row["actual_mw"]) if pd.notna(row.get("actual_mw")) else None,
                error_mw=float(row["error_mw"]) if pd.notna(row.get("error_mw")) else None,
            )
        )

    return DayAheadResponse(
        delivery_date=delivery_date,
        cutoff_applied_utc=cutoff_utc.isoformat(),
        cutoff_time_uk=cutoff_time,
        summary=DayAheadSummary(**summary_dict),
        periods=periods,
    )


@router.get("/vintages", response_model=VintagesResponse)
def get_forecast_vintages(
    delivery_date: str = Query(
        ...,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="Target delivery date (YYYY-MM-DD)",
    ),
    settlement_period: int = Query(
        ...,
        ge=1,
        le=50,
        description="Target settlement period (1-48)",
    ),
):
    """Retrieve all published forecast vintages over time for a single settlement half-hour.

    Demonstrates forecast evolution and convergence as lead time decreases toward real time.
    """
    actuals_df = store.get_actuals()
    forecasts_df = store.get_forecasts()

    # Find the target start_time_utc
    period_actual = actuals_df[
        (actuals_df["settlement_date"] == delivery_date) &
        (actuals_df["settlement_period"] == settlement_period)
    ]

    if period_actual.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Settlement period {settlement_period} on {delivery_date} not found.",
        )

    target_start_time = period_actual.iloc[0]["start_time_utc"]
    actual_mw = float(period_actual.iloc[0]["actual_mw"])

    # Hourly forecast resolution mapping: match target hour
    hour_target = target_start_time.floor("h")
    vintages_df = forecasts_df[forecasts_df["start_time_utc"] == hour_target].copy()
    vintages_df = vintages_df.sort_values("publish_time_utc", ascending=True)

    items = []
    for _, row in vintages_df.iterrows():
        # Horizon hours relative to this specific settlement period
        lead_time = round((target_start_time - row["publish_time_utc"]).total_seconds() / 3600.0, 2)
        items.append(
            ForecastVintageItem(
                publish_time_utc=pd.to_datetime(row["publish_time_utc"]).to_pydatetime(),
                horizon_hours=lead_time,
                forecast_mw=float(row["forecast_mw"]),
            )
        )

    return VintagesResponse(
        delivery_date=delivery_date,
        settlement_period=settlement_period,
        start_time_utc=pd.to_datetime(target_start_time).to_pydatetime(),
        actual_mw=actual_mw,
        vintages=items,
    )
