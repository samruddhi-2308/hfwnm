"""
Metadata and dataset health router for the UK Wind Forecast Portal.

Endpoint:
- GET /api/v1/meta: Detailed dataset health, period coverage audit, and snapshot info
"""
from __future__ import annotations

from fastapi import APIRouter
from app.data_store import store
from app.schemas import MetaResponse

router = APIRouter(prefix="/meta", tags=["Metadata"])


@router.get("", response_model=MetaResponse)
def get_metadata():
    """Retrieve dataset audit trail, coverage metrics, and pipeline snapshot health."""
    meta = store.get_metadata()
    actuals_df = store.get_actuals()
    forecasts_df = store.get_forecasts()
    paired_df = store.get_paired()

    january_actuals = len(actuals_df[actuals_df["settlement_date"].str.startswith("2026-01")]) if "settlement_date" in actuals_df.columns else len(actuals_df)
    completeness_pct = round((january_actuals / 1488.0) * 100.0, 2)

    health = "HEALTHY" if completeness_pct >= 99.0 else ("DEGRADED" if completeness_pct >= 80.0 else "INCOMPLETE")

    return MetaResponse(
        dataset_health=meta.get("dataset_health", health),
        total_actual_records=len(actuals_df),
        total_forecast_records=len(forecasts_df),
        total_paired_records=len(paired_df),
        january_periods_actual=january_actuals,
        january_completeness_pct=completeness_pct,
        missing_intervals=meta.get("missing_intervals", []),
        last_build_timestamp=meta.get("last_build_timestamp"),
    )
