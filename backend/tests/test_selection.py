"""
Unit tests for Day-Ahead Cutoff Selection Engine.

Guarantees strict zero look-ahead bias and correct D-1 cutoff enforcement.
"""
from __future__ import annotations

import pandas as pd
import pytest

from app.services.selection import compute_cutoff_utc, select_dayahead_forecasts


def test_cutoff_utc_computation():
    """Verify D-1 cutoff timestamp calculation."""
    # Delivery day: 2026-01-15 -> D-1 is 2026-01-14
    # Cutoff time: 09:00 in Europe/London (which is UTC+0 in January)
    cutoff = compute_cutoff_utc("2026-01-15", "09:00")
    assert cutoff.year == 2026
    assert cutoff.month == 1
    assert cutoff.day == 14
    assert cutoff.hour == 9
    assert cutoff.minute == 0


def test_strict_zero_lookahead_enforcement():
    """Verify that a forecast published AFTER the cutoff is strictly ignored.

    Scenario:
        Target delivery day: 2026-01-15
        Cutoff: 09:00 UK on 2026-01-14
        Target settlement period 1: start_time = 2026-01-15 00:00:00 UTC

        We provide 3 forecast vintages for this target period:
        1. Published 2026-01-14 06:00:00 UTC -> forecast_mw = 8000.0 (Eligible)
        2. Published 2026-01-14 09:00:00 UTC -> forecast_mw = 8500.0 (Eligible - exact cutoff boundary)
        3. Published 2026-01-14 09:01:00 UTC -> forecast_mw = 9500.0 (Ineligible - post-cutoff leak!)
        4. Published 2026-01-14 22:00:00 UTC -> forecast_mw = 9900.0 (Ineligible - evening update!)

    The engine MUST select the vintage published at 09:00 (8500.0 MW) and IGNORE the later updates.
    """
    target_start = pd.Timestamp("2026-01-15 00:00:00", tz="UTC")

    actuals_df = pd.DataFrame([{
        "start_time_utc": target_start,
        "settlement_date": "2026-01-15",
        "settlement_period": 1,
        "actual_mw": 8400.0,
    }])

    forecasts_df = pd.DataFrame([
        {
            "start_time_utc": target_start,
            "publish_time_utc": pd.Timestamp("2026-01-14 06:00:00", tz="UTC"),
            "horizon_hours": 18.0,
            "forecast_mw": 8000.0,
        },
        {
            "start_time_utc": target_start,
            "publish_time_utc": pd.Timestamp("2026-01-14 09:00:00", tz="UTC"),
            "horizon_hours": 15.0,
            "forecast_mw": 8500.0,
        },
        {
            "start_time_utc": target_start,
            "publish_time_utc": pd.Timestamp("2026-01-14 09:01:00", tz="UTC"),
            "horizon_hours": 14.98,
            "forecast_mw": 9500.0,
        },
        {
            "start_time_utc": target_start,
            "publish_time_utc": pd.Timestamp("2026-01-14 22:00:00", tz="UTC"),
            "horizon_hours": 2.0,
            "forecast_mw": 9900.0,
        },
    ])

    selected, cutoff_utc = select_dayahead_forecasts(
        forecasts_df=forecasts_df,
        actuals_df=actuals_df,
        delivery_date_str="2026-01-15",
        cutoff_time_uk="09:00",
        include_actuals=True,
    )

    assert len(selected) == 1
    selected_row = selected.iloc[0]

    # Verify: Must have chosen the 09:00 vintage (8500.0), NOT 9500 or 9900!
    assert selected_row["forecast_mw"] == 8500.0
    assert selected_row["publish_time_utc"] == pd.Timestamp("2026-01-14 09:00:00", tz="UTC")
    # Signed error = actual - forecast = 8400 - 8500 = -100 MW
    assert selected_row["error_mw"] == -100.0


def test_cutoff_earlier_time():
    """Verify cutoff adjustment to 07:00 correctly excludes the 09:00 vintage."""
    target_start = pd.Timestamp("2026-01-15 00:00:00", tz="UTC")

    actuals_df = pd.DataFrame([{
        "start_time_utc": target_start,
        "settlement_date": "2026-01-15",
        "settlement_period": 1,
        "actual_mw": 8400.0,
    }])

    forecasts_df = pd.DataFrame([
        {
            "start_time_utc": target_start,
            "publish_time_utc": pd.Timestamp("2026-01-14 06:00:00", tz="UTC"),
            "horizon_hours": 18.0,
            "forecast_mw": 8000.0,
        },
        {
            "start_time_utc": target_start,
            "publish_time_utc": pd.Timestamp("2026-01-14 09:00:00", tz="UTC"),
            "horizon_hours": 15.0,
            "forecast_mw": 8500.0,
        },
    ])

    selected, _ = select_dayahead_forecasts(
        forecasts_df=forecasts_df,
        actuals_df=actuals_df,
        delivery_date_str="2026-01-15",
        cutoff_time_uk="07:00",
        include_actuals=True,
    )

    assert selected.iloc[0]["forecast_mw"] == 8000.0
    assert selected.iloc[0]["publish_time_utc"] == pd.Timestamp("2026-01-14 06:00:00", tz="UTC")


def test_selection_without_actuals():
    """Verify include_actuals=False sets actual_mw and error_mw to NaN."""
    target_start = pd.Timestamp("2026-01-15 00:00:00", tz="UTC")
    actuals_df = pd.DataFrame([{
        "start_time_utc": target_start,
        "settlement_date": "2026-01-15",
        "settlement_period": 1,
        "actual_mw": 8400.0,
    }])
    forecasts_df = pd.DataFrame([{
        "start_time_utc": target_start,
        "publish_time_utc": pd.Timestamp("2026-01-14 06:00:00", tz="UTC"),
        "horizon_hours": 18.0,
        "forecast_mw": 8000.0,
    }])

    selected, _ = select_dayahead_forecasts(
        forecasts_df=forecasts_df,
        actuals_df=actuals_df,
        delivery_date_str="2026-01-15",
        cutoff_time_uk="09:00",
        include_actuals=False,
    )

    assert pd.isna(selected.iloc[0]["actual_mw"])
    assert pd.isna(selected.iloc[0]["error_mw"])
