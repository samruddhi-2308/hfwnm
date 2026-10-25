"""
Master Snapshot Builder.

Orchestrates the full pipeline: ingest (or mock) -> clean -> pair -> write Parquet.

Usage:
    # From the backend/ directory:
    python -m pipeline.build_snapshot              # Use live Elexon API (cached)
    python -m pipeline.build_snapshot --mock       # Use mock data
    python -m pipeline.build_snapshot --force      # Re-fetch from API (ignore cache)
"""
from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from pipeline.clean import CleaningReport, clean_actuals, clean_forecasts, pair_forecasts_with_actuals
from pipeline.ingest import fetch_fuelhh, fetch_windfor
from pipeline.mock_generator import generate_all

logger = logging.getLogger(__name__)

PROCESSED_DIR = Path(__file__).resolve().parent.parent / "data" / "processed"


def build_snapshot(use_mock: bool = False, force: bool = False) -> CleaningReport:
    """
    Run the full data pipeline:
    1. Fetch raw data (from Elexon API or mock generator)
    2. Clean and validate actuals and forecasts
    3. Pair forecasts with actuals
    4. Write Parquet snapshots and metadata JSON

    Args:
        use_mock: If True, use mock data instead of live API.
        force: If True, re-fetch from API even if cached (ignored for mock).

    Returns:
        CleaningReport with all drop counts and coverage metrics.
    """
    report = CleaningReport()
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    # Step 1: Ingest
    if use_mock:
        logger.info("Using MOCK data generator (offline mode)")
        raw_actuals, raw_forecasts = generate_all()
    else:
        logger.info("Fetching from live Elexon BMRS API...")
        raw_actuals = fetch_fuelhh(force=force)
        raw_forecasts = fetch_windfor(force=force)

    # Step 2: Clean
    logger.info("Cleaning actuals...")
    actuals_df = clean_actuals(raw_actuals, report)

    logger.info("Cleaning forecasts...")
    forecasts_df = clean_forecasts(raw_forecasts, report)

    # Step 3: Pair
    logger.info("Pairing forecasts with actuals...")
    paired_df = pair_forecasts_with_actuals(actuals_df, forecasts_df, report)

    # Step 4: Write Parquet snapshots
    logger.info("Writing Parquet snapshots...")

    actuals_path = PROCESSED_DIR / "actuals.parquet"
    actuals_df.to_parquet(actuals_path, engine="pyarrow", index=False)
    logger.info(f"  Written: {actuals_path} ({len(actuals_df)} rows)")

    forecasts_path = PROCESSED_DIR / "forecasts.parquet"
    forecasts_df.to_parquet(forecasts_path, engine="pyarrow", index=False)
    logger.info(f"  Written: {forecasts_path} ({len(forecasts_df)} rows)")

    paired_path = PROCESSED_DIR / "paired_all.parquet"
    paired_df.to_parquet(paired_path, engine="pyarrow", index=False)
    logger.info(f"  Written: {paired_path} ({len(paired_df)} rows)")

    # Step 5: Write metadata
    metadata = {
        "build_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "data_source": "mock" if use_mock else "elexon_bmrs_api",
        "target_month": "2026-01",
        "cleaning_report": report.to_dict(),
        "file_sizes": {
            "actuals_parquet_bytes": actuals_path.stat().st_size,
            "forecasts_parquet_bytes": forecasts_path.stat().st_size,
            "paired_parquet_bytes": paired_path.stat().st_size,
        },
        "row_counts": {
            "actuals": len(actuals_df),
            "forecasts": len(forecasts_df),
            "paired": len(paired_df),
        },
    }

    metadata_path = PROCESSED_DIR / "metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"  Written: {metadata_path}")

    # Summary
    logger.info("=" * 60)
    logger.info("SNAPSHOT BUILD COMPLETE")
    logger.info(f"  Actuals:   {len(actuals_df):>8} rows")
    logger.info(f"  Forecasts: {len(forecasts_df):>8} rows")
    logger.info(f"  Paired:    {len(paired_df):>8} rows")
    logger.info(
        f"  January coverage: {report.january_periods_actual}/{report.january_periods_expected} "
        f"({report.january_periods_actual / report.january_periods_expected * 100:.1f}%)"
    )
    if report.missing_periods:
        logger.warning(f"  Missing {len(report.missing_periods)} January periods!")
    logger.info("=" * 60)

    return report


if __name__ == "__main__":
    import argparse

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        stream=sys.stdout,
    )

    parser = argparse.ArgumentParser(description="Build processed Parquet snapshots for January 2026")
    parser.add_argument("--mock", action="store_true", help="Use mock data generator instead of live API")
    parser.add_argument("--force", action="store_true", help="Re-fetch from API even if cached")
    args = parser.parse_args()

    build_snapshot(use_mock=args.mock, force=args.force)
