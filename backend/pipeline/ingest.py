"""
Elexon BMRS Data Ingestion Pipeline.

Fetches FUELHH (wind actuals) and WINDFOR (wind forecast vintages) data
from the Elexon Insights Solution REST API in chunked date windows with
retry logic and local disk caching.

Usage:
    python -m pipeline.ingest [--force]
"""
from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential_jitter,
)

logger = logging.getLogger(__name__)

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
CHUNK_DIR = RAW_DIR / "chunks"

# --- January 2026 ingestion boundaries ---
# Actuals: settlement dates 2025-12-31 to 2026-02-01 (buffer for edge periods)
ACTUALS_START = "2025-12-31"
ACTUALS_END = "2026-02-01"

# Forecasts: published from late December 2025 (to capture long-horizon forecasts
# for early January targets) through end of January 2026
FORECASTS_PUBLISH_START = "2025-12-28T00:00:00Z"
FORECASTS_PUBLISH_END = "2026-01-31T23:59:59Z"

# Chunk sizes
ACTUALS_CHUNK_DAYS = 3
FORECASTS_CHUNK_HOURS = 12  # WINDFOR can return many rows per hour


@retry(
    retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.ConnectError, httpx.TimeoutException)),
    stop=stop_after_attempt(4),
    wait=wait_exponential_jitter(initial=2, max=30, jitter=5),
    before_sleep=lambda retry_state: logger.warning(
        f"Retry {retry_state.attempt_number} after error: {retry_state.outcome.exception()}"
    ),
)
def _fetch_url(client: httpx.Client, url: str, params: dict[str, str]) -> list[dict[str, Any]]:
    """Fetch a single API page with retry logic."""
    resp = client.get(url, params=params, timeout=30.0)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, list):
        return data
    # Some endpoints wrap in a container
    if isinstance(data, dict) and "data" in data:
        return data["data"]  # type: ignore[no-any-return]
    return [data]


def _cache_path(dataset: str, chunk_index: int) -> Path:
    """Return the file path for a cached chunk."""
    return CHUNK_DIR / dataset / f"chunk_{chunk_index:04d}.json"


def _load_cached(path: Path) -> list[dict[str, Any]] | None:
    """Load a cached chunk from disk if it exists."""
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)  # type: ignore[no-any-return]
    return None


def _save_cache(path: Path, data: list[dict[str, Any]]) -> None:
    """Save fetched data to disk cache."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f)


def fetch_fuelhh(force: bool = False) -> list[dict[str, Any]]:
    """
    Fetch all FUELHH (half-hourly generation by fuel type) data for the
    January 2026 analysis window, chunked by settlement date ranges.

    Args:
        force: If True, re-fetch even if cached chunks exist.

    Returns:
        List of all raw FUELHH JSON records (all fuel types).
    """
    all_records: list[dict[str, Any]] = []
    start = datetime.strptime(ACTUALS_START, "%Y-%m-%d")
    end = datetime.strptime(ACTUALS_END, "%Y-%m-%d")
    chunk_idx = 0

    logger.info(f"Fetching FUELHH actuals from {ACTUALS_START} to {ACTUALS_END}")

    with httpx.Client() as client:
        current = start
        while current < end:
            chunk_end = min(current + timedelta(days=ACTUALS_CHUNK_DAYS), end)
            cache_file = _cache_path("fuelhh", chunk_idx)

            if not force:
                cached = _load_cached(cache_file)
                if cached is not None:
                    logger.info(
                        f"  FUELHH chunk {chunk_idx}: loaded {len(cached)} cached records "
                        f"({current.strftime('%Y-%m-%d')} to {chunk_end.strftime('%Y-%m-%d')})"
                    )
                    all_records.extend(cached)
                    current = chunk_end
                    chunk_idx += 1
                    continue

            params = {
                "settlementDateFrom": current.strftime("%Y-%m-%d"),
                "settlementDateTo": chunk_end.strftime("%Y-%m-%d"),
                "format": "json",
            }
            logger.info(
                f"  FUELHH chunk {chunk_idx}: fetching {current.strftime('%Y-%m-%d')} "
                f"to {chunk_end.strftime('%Y-%m-%d')}..."
            )

            data = _fetch_url(client, f"{BASE_URL}/FUELHH/stream", params)
            _save_cache(cache_file, data)
            all_records.extend(data)
            logger.info(f"    -> {len(data)} records fetched and cached")

            current = chunk_end
            chunk_idx += 1
            time.sleep(0.5)  # Polite rate limiting

    logger.info(f"FUELHH total: {len(all_records)} raw records across {chunk_idx} chunks")
    return all_records


def fetch_windfor(force: bool = False) -> list[dict[str, Any]]:
    """
    Fetch all WINDFOR (wind generation forecast) vintages for the
    January 2026 analysis window, chunked by publishDateTime ranges.

    Args:
        force: If True, re-fetch even if cached chunks exist.

    Returns:
        List of all raw WINDFOR JSON records.
    """
    all_records: list[dict[str, Any]] = []
    start = datetime.fromisoformat(FORECASTS_PUBLISH_START.replace("Z", "+00:00"))
    end = datetime.fromisoformat(FORECASTS_PUBLISH_END.replace("Z", "+00:00"))
    chunk_delta = timedelta(hours=FORECASTS_CHUNK_HOURS)
    chunk_idx = 0

    logger.info(f"Fetching WINDFOR forecasts published from {FORECASTS_PUBLISH_START} to {FORECASTS_PUBLISH_END}")

    with httpx.Client() as client:
        current = start
        while current < end:
            chunk_end = min(current + chunk_delta, end)
            cache_file = _cache_path("windfor", chunk_idx)

            if not force:
                cached = _load_cached(cache_file)
                if cached is not None:
                    logger.info(
                        f"  WINDFOR chunk {chunk_idx}: loaded {len(cached)} cached records"
                    )
                    all_records.extend(cached)
                    current = chunk_end
                    chunk_idx += 1
                    continue

            params = {
                "publishDateTimeFrom": current.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "publishDateTimeTo": chunk_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "format": "json",
            }
            logger.info(
                f"  WINDFOR chunk {chunk_idx}: fetching publishTime "
                f"{current.isoformat()} to {chunk_end.isoformat()}..."
            )

            data = _fetch_url(client, f"{BASE_URL}/WINDFOR/stream", params)
            _save_cache(cache_file, data)
            all_records.extend(data)
            logger.info(f"    -> {len(data)} records fetched and cached")

            current = chunk_end
            chunk_idx += 1
            time.sleep(0.3)  # Polite rate limiting

    logger.info(f"WINDFOR total: {len(all_records)} raw records across {chunk_idx} chunks")
    return all_records


if __name__ == "__main__":
    import argparse
    import sys

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        stream=sys.stdout,
    )

    parser = argparse.ArgumentParser(description="Fetch Elexon BMRS data for January 2026")
    parser.add_argument("--force", action="store_true", help="Re-fetch even if cached")
    args = parser.parse_args()

    logger.info("=== Elexon BMRS Data Ingestion ===")
    fuelhh = fetch_fuelhh(force=args.force)
    windfor = fetch_windfor(force=args.force)
    logger.info(f"Done. FUELHH: {len(fuelhh)} records, WINDFOR: {len(windfor)} records")
