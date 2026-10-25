"""
Unit tests for the data pipeline: cleaning, horizon calculation, pairing,
and coverage validation.

Uses hand-crafted fixtures with known expected outcomes.
"""
from __future__ import annotations

import pandas as pd
import pytest

from pipeline.clean import (
    CleaningReport,
    clean_actuals,
    clean_forecasts,
    pair_forecasts_with_actuals,
    JAN_2026_START,
    JAN_2026_END,
    MAX_HORIZON_HOURS,
)
from pipeline.mock_generator import generate_actuals, generate_forecasts, generate_all


# ---------------------------------------------------------------------------
# Fixtures: small hand-crafted datasets with known properties
# ---------------------------------------------------------------------------

def _make_fuelhh_records() -> list[dict]:
    """Create minimal FUELHH records for testing cleaning logic."""
    return [
        # Valid WIND record
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-01T01:00:00Z",
            "startTime": "2026-01-01T00:00:00Z",
            "settlementDate": "2026-01-01",
            "settlementPeriod": 1,
            "fuelType": "WIND",
            "generation": 12000.0,
        },
        # Valid WIND record (period 2)
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-01T01:30:00Z",
            "startTime": "2026-01-01T00:30:00Z",
            "settlementDate": "2026-01-01",
            "settlementPeriod": 2,
            "fuelType": "WIND",
            "generation": 11500.0,
        },
        # Non-wind record (should be dropped)
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-01T01:00:00Z",
            "startTime": "2026-01-01T00:00:00Z",
            "settlementDate": "2026-01-01",
            "settlementPeriod": 1,
            "fuelType": "GAS",
            "generation": 5000.0,
        },
        # Negative generation (should be dropped)
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-01T02:00:00Z",
            "startTime": "2026-01-01T01:00:00Z",
            "settlementDate": "2026-01-01",
            "settlementPeriod": 3,
            "fuelType": "WIND",
            "generation": -100.0,
        },
        # Outside January (should be dropped)
        {
            "dataset": "FUELHH",
            "publishTime": "2025-12-31T01:00:00Z",
            "startTime": "2025-12-31T00:00:00Z",
            "settlementDate": "2025-12-31",
            "settlementPeriod": 1,
            "fuelType": "WIND",
            "generation": 10000.0,
        },
    ]


def _make_windfor_records() -> list[dict]:
    """Create minimal WINDFOR records for testing cleaning logic."""
    return [
        # Valid forecast: 15h horizon for period 1
        {
            "dataset": "WINDFOR",
            "publishTime": "2025-12-31T09:00:00Z",
            "startTime": "2026-01-01T00:00:00Z",
            "generation": 12500.0,
        },
        # Valid forecast: 24h horizon for period 1 (earlier vintage)
        {
            "dataset": "WINDFOR",
            "publishTime": "2025-12-31T00:00:00Z",
            "startTime": "2026-01-01T00:00:00Z",
            "generation": 13000.0,
        },
        # Valid forecast for period 2
        {
            "dataset": "WINDFOR",
            "publishTime": "2025-12-31T09:00:00Z",
            "startTime": "2026-01-01T00:30:00Z",
            "generation": 11000.0,
        },
        # Negative horizon (published after target) -> should be dropped
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T01:00:00Z",
            "startTime": "2026-01-01T00:00:00Z",
            "generation": 12000.0,
        },
        # Over 48h horizon -> should be dropped
        {
            "dataset": "WINDFOR",
            "publishTime": "2025-12-29T00:00:00Z",
            "startTime": "2026-01-01T00:00:00Z",
            "generation": 14000.0,
        },
        # Outside January target -> should be dropped
        {
            "dataset": "WINDFOR",
            "publishTime": "2025-12-30T00:00:00Z",
            "startTime": "2025-12-31T00:00:00Z",
            "generation": 10000.0,
        },
    ]


# ---------------------------------------------------------------------------
# Test: Actuals cleaning
# ---------------------------------------------------------------------------

class TestCleanActuals:
    def test_filters_to_wind_only(self):
        report = CleaningReport()
        df = clean_actuals(_make_fuelhh_records(), report)
        # Should have only WIND records that are in January and non-negative
        assert report.fuelhh_non_wind_dropped == 1

    def test_drops_negative_generation(self):
        report = CleaningReport()
        df = clean_actuals(_make_fuelhh_records(), report)
        assert report.fuelhh_negative_gen_dropped == 1
        # No negative values in output
        assert (df["actual_mw"] >= 0).all()

    def test_january_only(self):
        report = CleaningReport()
        df = clean_actuals(_make_fuelhh_records(), report)
        # The Dec 31 record should be excluded
        for ts in df["start_time_utc"]:
            assert ts >= JAN_2026_START

    def test_output_columns(self):
        report = CleaningReport()
        df = clean_actuals(_make_fuelhh_records(), report)
        expected_cols = {"start_time_utc", "settlement_date", "settlement_period", "actual_mw"}
        assert set(df.columns) == expected_cols

    def test_valid_records_kept(self):
        report = CleaningReport()
        df = clean_actuals(_make_fuelhh_records(), report)
        # 2 valid January WIND records (periods 1 and 2; period 3 has negative gen)
        assert len(df) == 2


# ---------------------------------------------------------------------------
# Test: Forecasts cleaning
# ---------------------------------------------------------------------------

class TestCleanForecasts:
    def test_drops_negative_horizon(self):
        report = CleaningReport()
        df = clean_forecasts(_make_windfor_records(), report)
        assert report.windfor_negative_horizon_dropped == 1
        # All horizons >= 0
        assert (df["horizon_hours"] >= 0).all()

    def test_drops_over_max_horizon(self):
        report = CleaningReport()
        df = clean_forecasts(_make_windfor_records(), report)
        assert report.windfor_over_horizon_dropped == 1
        # All horizons <= MAX_HORIZON_HOURS
        assert (df["horizon_hours"] <= MAX_HORIZON_HOURS).all()

    def test_drops_outside_january(self):
        report = CleaningReport()
        df = clean_forecasts(_make_windfor_records(), report)
        assert report.windfor_outside_jan_dropped == 1

    def test_horizon_calculation_correct(self):
        report = CleaningReport()
        df = clean_forecasts(_make_windfor_records(), report)
        # Check the 15h horizon record: startTime=Jan1 00:00, publishTime=Dec31 09:00
        row_15h = df[df["horizon_hours"] == 15.0]
        assert len(row_15h) == 1
        assert row_15h.iloc[0]["forecast_mw"] == 12500.0

    def test_output_columns(self):
        report = CleaningReport()
        df = clean_forecasts(_make_windfor_records(), report)
        expected_cols = {"start_time_utc", "publish_time_utc", "horizon_hours", "forecast_mw"}
        assert set(df.columns) == expected_cols

    def test_valid_records_kept(self):
        report = CleaningReport()
        df = clean_forecasts(_make_windfor_records(), report)
        # 3 valid records: two for period 1 (15h and 24h) and one for period 2 (15.5h)
        assert len(df) == 3


# ---------------------------------------------------------------------------
# Test: Pairing
# ---------------------------------------------------------------------------

class TestPairing:
    def test_inner_join_on_start_time(self):
        report = CleaningReport()
        actuals = clean_actuals(_make_fuelhh_records(), report)
        forecasts = clean_forecasts(_make_windfor_records(), report)
        paired = pair_forecasts_with_actuals(actuals, forecasts, report)
        # Only periods with both actual and forecast data get paired
        assert len(paired) > 0
        assert len(paired) <= len(forecasts)

    def test_error_sign_convention(self):
        """Error = actual - forecast. Positive = over-delivered."""
        report = CleaningReport()
        actuals = clean_actuals(_make_fuelhh_records(), report)
        forecasts = clean_forecasts(_make_windfor_records(), report)
        paired = pair_forecasts_with_actuals(actuals, forecasts, report)

        for _, row in paired.iterrows():
            expected_error = row["actual_mw"] - row["forecast_mw"]
            assert abs(row["error_mw"] - expected_error) < 0.01
            assert abs(row["abs_error_mw"] - abs(expected_error)) < 0.01

    def test_output_columns(self):
        report = CleaningReport()
        actuals = clean_actuals(_make_fuelhh_records(), report)
        forecasts = clean_forecasts(_make_windfor_records(), report)
        paired = pair_forecasts_with_actuals(actuals, forecasts, report)
        expected_cols = {
            "start_time_utc", "publish_time_utc", "horizon_hours",
            "forecast_mw", "actual_mw", "error_mw", "abs_error_mw", "pct_error",
        }
        assert set(paired.columns) == expected_cols


# ---------------------------------------------------------------------------
# Test: Mock generator integrity
# ---------------------------------------------------------------------------

class TestMockGenerator:
    def test_actuals_count(self):
        """January 2026 = 31 days * 48 periods = 1488 records."""
        actuals = generate_actuals()
        assert len(actuals) == 1488

    def test_actuals_all_wind(self):
        actuals = generate_actuals()
        assert all(r["fuelType"] == "WIND" for r in actuals)

    def test_actuals_no_negative_generation(self):
        actuals = generate_actuals()
        assert all(r["generation"] >= 0 for r in actuals)

    def test_forecasts_generated(self):
        actuals = generate_actuals()
        forecasts = generate_forecasts(actuals)
        assert len(forecasts) > 0
        # Should have many more forecast records than actuals (multiple vintages)
        assert len(forecasts) > len(actuals)

    def test_forecasts_no_negative_generation(self):
        actuals = generate_actuals()
        forecasts = generate_forecasts(actuals)
        assert all(r["generation"] >= 0 for r in forecasts)

    def test_mock_pipeline_end_to_end(self):
        """Full pipeline with mock data produces 1488 January actuals."""
        mock_actuals, mock_forecasts = generate_all()
        report = CleaningReport()

        actuals_df = clean_actuals(mock_actuals, report)
        forecasts_df = clean_forecasts(mock_forecasts, report)
        paired_df = pair_forecasts_with_actuals(actuals_df, forecasts_df, report)

        # Coverage check
        assert report.actuals_final == 1488, (
            f"Expected 1488 January actuals, got {report.actuals_final}"
        )
        assert report.january_periods_actual == 1488
        assert len(report.missing_periods) == 0

        # Forecasts should survive cleaning
        assert report.forecasts_final > 0

        # All paired records should have valid errors
        assert len(paired_df) > 0
        assert paired_df["error_mw"].notna().all()
        assert paired_df["abs_error_mw"].notna().all()

        # Horizon range check on paired data
        assert (paired_df["horizon_hours"] >= 0).all()
        assert (paired_df["horizon_hours"] <= MAX_HORIZON_HOURS).all()
