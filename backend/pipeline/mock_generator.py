"""
Mock Data Generator for offline development and testing.

Generates realistic January 2026 wind generation (actuals) and
multi-vintage forecast streams, modeled on typical UK wind patterns.

This guarantees zero development blocks if the Elexon API is
unreachable, rate-limited, or returning incomplete data.

Usage:
    python -m pipeline.mock_generator
"""
from __future__ import annotations

import json
import logging
import math
import random
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

# UK wind generation capacity and typical ranges (MW)
UK_WIND_CAPACITY_MW = 30000  # Approximate total installed wind capacity
MEAN_WIND_OUTPUT_MW = 12000
OUTPUT_STD_MW = 4000
MIN_WIND_MW = 800
MAX_WIND_MW = 25000

# Forecast error characteristics
BASE_FORECAST_ERROR_STD_MW = 200  # Error at 0h horizon
HORIZON_ERROR_GROWTH_MW_PER_H = 25  # Additional error std per hour of horizon

# How often new forecast vintages are published (hours)
VINTAGE_PUBLISH_INTERVAL_HOURS = 2


def _generate_wind_profile(seed: int = 42) -> list[float]:
    """
    Generate a realistic 31-day (1488 half-hour periods) wind generation profile
    for January 2026, incorporating:
    - Diurnal pattern (slightly higher wind at night/early morning)
    - Multi-day weather system cycles (3-5 day synoptic patterns)
    - Random turbulence noise

    Returns:
        List of 1488 MW values (one per half-hour settlement period).
    """
    rng = random.Random(seed)
    n_periods = 31 * 48  # 1488

    profile: list[float] = []
    # Base slow-varying component: weather fronts passing through
    # Use overlapping sinusoids with different periods
    for i in range(n_periods):
        hour_of_day = (i % 48) / 2.0  # 0.0 to 23.5

        # Synoptic weather pattern (3-5 day cycles)
        synoptic = (
            math.sin(2 * math.pi * i / (48 * 3.7)) * 3000
            + math.sin(2 * math.pi * i / (48 * 5.2) + 1.3) * 2000
            + math.sin(2 * math.pi * i / (48 * 7.1) + 2.7) * 1500
        )

        # Diurnal pattern: wind slightly stronger overnight in UK winter
        diurnal = math.sin(2 * math.pi * (hour_of_day - 3) / 24) * 800

        # Random turbulence
        turbulence = rng.gauss(0, OUTPUT_STD_MW * 0.3)

        value = MEAN_WIND_OUTPUT_MW + synoptic + diurnal + turbulence
        value = max(MIN_WIND_MW, min(MAX_WIND_MW, value))
        profile.append(round(value, 1))

    return profile


def generate_actuals(seed: int = 42) -> list[dict[str, Any]]:
    """
    Generate mock FUELHH records (wind actuals) for January 2026.

    Returns:
        List of dictionaries matching the Elexon FUELHH JSON schema.
    """
    profile = _generate_wind_profile(seed)
    records: list[dict[str, Any]] = []

    base_time = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    for i, mw in enumerate(profile):
        start_time = base_time + timedelta(minutes=30 * i)
        settlement_date = start_time.strftime("%Y-%m-%d")
        settlement_period = (i % 48) + 1

        records.append({
            "dataset": "FUELHH",
            "publishTime": (start_time + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "startTime": start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "settlementDate": settlement_date,
            "settlementPeriod": settlement_period,
            "fuelType": "WIND",
            "generation": mw,
        })

    logger.info(f"Generated {len(records)} mock FUELHH (wind actual) records for January 2026")
    return records


def generate_forecasts(
    actuals: list[dict[str, Any]],
    seed: int = 42,
    max_horizon_hours: float = 48.0,
    publish_interval_hours: float = VINTAGE_PUBLISH_INTERVAL_HOURS,
) -> list[dict[str, Any]]:
    """
    Generate mock WINDFOR records (forecast vintages) for January 2026.

    For each target settlement period, generates multiple forecast vintages
    published at different times (every `publish_interval_hours`), with
    error increasing as a function of forecast horizon.

    Args:
        actuals: The mock actual records (used as ground truth).
        seed: Random seed for reproducibility.
        max_horizon_hours: Maximum forecast lead time to generate.
        publish_interval_hours: How often new vintages are "published".

    Returns:
        List of dictionaries matching the Elexon WINDFOR JSON schema.
    """
    rng = random.Random(seed + 1)

    # Build actual lookup: startTime -> generation
    actual_lookup: dict[str, float] = {}
    for rec in actuals:
        actual_lookup[rec["startTime"]] = rec["generation"]

    records: list[dict[str, Any]] = []
    base_time = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    for i in range(31 * 48):  # Each settlement period in January
        target_time = base_time + timedelta(minutes=30 * i)
        target_str = target_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        actual_mw = actual_lookup.get(target_str, MEAN_WIND_OUTPUT_MW)

        # Generate vintages from max_horizon down to ~0h
        horizon_h = max_horizon_hours
        while horizon_h >= 0:
            publish_time = target_time - timedelta(hours=horizon_h)

            # Only generate forecasts published from Dec 28 onwards
            if publish_time < datetime(2025, 12, 28, tzinfo=timezone.utc):
                horizon_h -= publish_interval_hours
                continue

            # Error increases with horizon
            error_std = BASE_FORECAST_ERROR_STD_MW + HORIZON_ERROR_GROWTH_MW_PER_H * horizon_h
            # Add a slight negative bias at longer horizons (common in wind forecasting)
            bias = -0.01 * horizon_h * MEAN_WIND_OUTPUT_MW / max_horizon_hours
            forecast_error = rng.gauss(bias, error_std)

            forecast_mw = actual_mw + forecast_error
            forecast_mw = max(0, min(UK_WIND_CAPACITY_MW, round(forecast_mw, 1)))

            records.append({
                "dataset": "WINDFOR",
                "publishTime": publish_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "startTime": target_str,
                "generation": forecast_mw,
            })

            horizon_h -= publish_interval_hours

    logger.info(f"Generated {len(records)} mock WINDFOR (forecast vintage) records for January 2026")
    return records


def generate_all(seed: int = 42) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Generate both mock actuals and forecasts, returning (actuals, forecasts)."""
    actuals = generate_actuals(seed)
    forecasts = generate_forecasts(actuals, seed)
    return actuals, forecasts


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", stream=sys.stdout)

    logger.info("=== Mock Data Generator ===")
    mock_actuals, mock_forecasts = generate_all()
    logger.info(f"Actuals: {len(mock_actuals)} records")
    logger.info(f"Forecasts: {len(mock_forecasts)} records")

    # Save to raw samples for inspection
    from pathlib import Path
    sample_dir = Path(__file__).resolve().parent.parent / "data" / "raw" / "samples"
    sample_dir.mkdir(parents=True, exist_ok=True)

    with open(sample_dir / "mock_actuals_sample.json", "w") as f:
        json.dump(mock_actuals[:5], f, indent=2)
    with open(sample_dir / "mock_forecasts_sample.json", "w") as f:
        json.dump(mock_forecasts[:5], f, indent=2)

    logger.info("Saved samples to data/raw/samples/")
