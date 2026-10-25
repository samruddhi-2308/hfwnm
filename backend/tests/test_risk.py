"""
Unit tests for Leave-One-Day-Out (LODO) Wind Risk Buffer Engine.

Proves zero data leakage and verifies empirical quantile and financial exposure math.
"""
from __future__ import annotations

import pandas as pd
import numpy as np
import pytest

from app.services.risk import compute_lodo_risk_bounds


def test_lodo_excludes_target_day():
    """Verify that Day D's own error records are completely excluded from training."""
    # Delivery Day D is 2026-01-15
    day_df = pd.DataFrame([{
        "settlement_period": 1,
        "start_time_utc": pd.Timestamp("2026-01-15 00:00:00", tz="UTC"),
        "publish_time_utc": pd.Timestamp("2026-01-14 09:00:00", tz="UTC"),
        "horizon_hours": 15.0,
        "forecast_mw": 10000.0,
        "actual_mw": 9000.0,
        "error_mw": -1000.0,
    }])

    # Historical data includes:
    # 1. Day 2026-01-14: error = -500.0
    # 2. Day 2026-01-15 (Target Day): error = -999999.0 (Massive outlier!)
    # 3. Day 2026-01-16: error = -600.0
    all_paired = pd.DataFrame([
        {
            "settlement_date": "2026-01-14",
            "settlement_period": 1,
            "start_time_utc": pd.Timestamp("2026-01-14 00:00:00", tz="UTC"),
            "error_mw": -500.0,
        },
        {
            "settlement_date": "2026-01-15",  # Target Day! Must be excluded!
            "settlement_period": 1,
            "start_time_utc": pd.Timestamp("2026-01-15 00:00:00", tz="UTC"),
            "error_mw": -999999.0,
        },
        {
            "settlement_date": "2026-01-16",
            "settlement_period": 1,
            "start_time_utc": pd.Timestamp("2026-01-16 00:00:00", tz="UTC"),
            "error_mw": -600.0,
        },
    ])

    enriched, summary = compute_lodo_risk_bounds(
        day_periods_df=day_df,
        all_paired_df=all_paired,
        delivery_date_str="2026-01-15",
        spread_gbp_per_mwh=85.0,
    )

    # If 2026-01-15 was NOT excluded, p10_lower_bound would be close to -999999!
    # Because it is excluded, errors are just [-500.0, -600.0]
    p10_lower = enriched.iloc[0]["p10_lower_bound_mw"]
    assert p10_lower > 9000.0  # 10000 + (-600 to -500) = ~9400.0 MW
    assert p10_lower < 10000.0

    # Risk buffer = forecast - p10_lower = ~500 to ~600 MW
    risk_buf = enriched.iloc[0]["risk_buffer_mw"]
    assert 400.0 <= risk_buf <= 700.0

    # Financial exposure = buffer * 0.5h * £85
    expected_exposure = risk_buf * 0.5 * 85.0
    assert summary["downside_financial_exposure_gbp"] == pytest.approx(expected_exposure, 0.1)
