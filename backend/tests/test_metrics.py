"""
Unit tests for the mathematical metrics engine.

Uses exact hand-calculated test fixtures to prove numerical accuracy.
"""
from __future__ import annotations

import math
import numpy as np
import pytest
import pandas as pd

from app.services.metrics import (
    calculate_signed_error,
    calculate_mae,
    calculate_rmse,
    calculate_bias,
    calculate_nmae,
    calculate_mape,
    calculate_quantiles,
    calculate_metrics_summary,
    calculate_metrics_by_horizon,
    calculate_daily_timeseries_accuracy,
)


def test_hand_calculated_metrics():
    """Verify MAE, RMSE, Bias, and nMAE against exact analytical math.

    Fixture:
        Actual:   [100.0, 200.0, 300.0]
        Forecast: [110.0, 190.0, 330.0]

    Signed error = actual - forecast:
        e1 = 100 - 110 = -10.0 (shortfall)
        e2 = 200 - 190 = +10.0 (overdelivery)
        e3 = 300 - 330 = -30.0 (shortfall)

    MAE = (| -10 | + | 10 | + | -30 |) / 3 = 50 / 3 = 16.6666...
    RMSE = sqrt((-10^2 + 10^2 + -30^2) / 3) = sqrt((100 + 100 + 900) / 3) = sqrt(1100 / 3) = 19.14854...
    Bias = (-10 + 10 - 30) / 3 = -10.0
    Mean Actual = (100 + 200 + 300) / 3 = 200.0
    nMAE = MAE / Mean Actual = (50 / 3) / 200 = 50 / 600 = 1 / 12 = 0.08333...
    """
    actual = np.array([100.0, 200.0, 300.0])
    forecast = np.array([110.0, 190.0, 330.0])

    errors = calculate_signed_error(actual, forecast)
    np.testing.assert_array_almost_equal(errors, np.array([-10.0, 10.0, -30.0]))

    mae = calculate_mae(actual, forecast)
    assert math.isclose(mae, 50.0 / 3.0, rel_tol=1e-5)

    rmse = calculate_rmse(actual, forecast)
    assert math.isclose(rmse, math.sqrt(1100.0 / 3.0), rel_tol=1e-5)

    bias = calculate_bias(actual, forecast)
    assert math.isclose(bias, -10.0, rel_tol=1e-5)

    nmae = calculate_nmae(actual, forecast)
    assert math.isclose(nmae, 1.0 / 12.0, rel_tol=1e-5)


def test_mape_with_capacity_floor():
    """Verify MAPE excludes periods below the capacity floor to prevent infinite blowups.

    Fixture:
        Actual:   [20.0, 100.0, 200.0]
        Forecast: [30.0, 110.0, 190.0]
        Floor:    100.0 MW

    The observation with actual=20.0 is BELOW the 100 MW floor and must be ignored.
    Valid subset:
        Actual: [100.0, 200.0]
        Forecast: [110.0, 190.0]
        Pct errors: |100 - 110| / 100 = 0.10 (10%)
                    |200 - 190| / 200 = 0.05 (5%)
        Mean = (10% + 5%) / 2 = 7.5%
    """
    actual = np.array([20.0, 100.0, 200.0])
    forecast = np.array([30.0, 110.0, 190.0])

    mape = calculate_mape(actual, forecast, floor_mw=100.0)
    assert math.isclose(mape, 7.5, rel_tol=1e-5)


def test_quantiles():
    """Verify empirical quantiles on an error array."""
    errors = np.array([-50.0, -20.0, -10.0, 0.0, 10.0, 20.0, 50.0])
    q = calculate_quantiles(errors, [0.10, 0.50, 0.90])
    assert "p10" in q and "p50" in q and "p90" in q
    assert q["p10"] < q["p50"] < q["p90"]
    assert math.isclose(q["p50"], 0.0, abs_tol=1e-3)


def test_empty_metrics():
    """Verify graceful handling of empty arrays."""
    assert calculate_mae([], []) == 0.0
    assert calculate_rmse([], []) == 0.0
    assert calculate_bias([], []) == 0.0
    assert calculate_nmae([], []) == 0.0
    assert calculate_mape([], []) == 0.0

    summary = calculate_metrics_summary([], [])
    assert summary["total_samples"] == 0
    assert summary["mae_mw"] == 0.0


def test_horizon_bucketing():
    """Verify grouping by lead time horizon bucket."""
    paired_data = pd.DataFrame({
        "horizon_hours": [0.5, 0.9, 1.2, 2.0, 24.5],
        "actual_mw": [1000.0, 1020.0, 1050.0, 1100.0, 1500.0],
        "forecast_mw": [1010.0, 1015.0, 1070.0, 1150.0, 1600.0],
    })
    buckets = calculate_metrics_by_horizon(paired_data, bucket_hours=1.0)
    assert len(buckets) >= 2
    # Check that buckets are sorted ascending
    horizons = [b["horizon_hours"] for b in buckets]
    assert horizons == sorted(horizons)
