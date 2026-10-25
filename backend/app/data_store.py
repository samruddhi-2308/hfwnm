"""
In-memory data store for the UK Wind Forecast Portal.

Loads processed Parquet snapshots and metadata at startup.
Guarantees sub-30ms read performance with zero external runtime dependencies.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional
import pandas as pd

from app.config import settings


class DataStore:
    """Singleton in-memory store for actuals, forecasts, and paired datasets."""

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or settings.actuals_path.parent
        self.actuals_df: pd.DataFrame = pd.DataFrame()
        self.forecasts_df: pd.DataFrame = pd.DataFrame()
        self.paired_df: pd.DataFrame = pd.DataFrame()
        self.metadata: dict = {}
        self._is_loaded = False

    def load(self, force: bool = False) -> None:
        """Load Parquet files into memory if not already loaded."""
        if self._is_loaded and not force:
            return

        actuals_path = self.data_dir / "actuals.parquet"
        forecasts_path = self.data_dir / "forecasts.parquet"
        paired_path = self.data_dir / "paired_all.parquet"
        metadata_path = self.data_dir / "metadata.json"

        if not actuals_path.exists() or not forecasts_path.exists() or not paired_path.exists():
            raise FileNotFoundError(
                f"Data snapshot files not found in {self.data_dir}. "
                "Run `python -m pipeline.build_snapshot` to generate them."
            )

        self.actuals_df = pd.read_parquet(actuals_path)
        self.forecasts_df = pd.read_parquet(forecasts_path)
        paired_df = pd.read_parquet(paired_path)

        # Ensure timestamps are UTC
        for df in (self.actuals_df, self.forecasts_df, paired_df):
            for col in ("start_time_utc", "publish_time_utc"):
                if col in df.columns:
                    if df[col].dt.tz is None:
                        df[col] = df[col].dt.tz_localize("UTC")
                    else:
                        df[col] = df[col].dt.tz_convert("UTC")

        # Enrich paired_df with settlement_date and settlement_period from actuals if missing
        if "settlement_date" not in paired_df.columns and "settlement_date" in self.actuals_df.columns:
            date_map = self.actuals_df.set_index("start_time_utc")[["settlement_date", "settlement_period"]]
            paired_df = paired_df.join(date_map, on="start_time_utc", how="left")

        self.paired_df = paired_df

        # Load metadata
        if metadata_path.exists():
            with open(metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {
                "dataset_health": "UNKNOWN",
                "actual_periods_january": len(self.actuals_df),
                "last_build_timestamp": None,
            }

        self._is_loaded = True

    def get_actuals(self) -> pd.DataFrame:
        if not self._is_loaded:
            self.load()
        return self.actuals_df

    def get_forecasts(self) -> pd.DataFrame:
        if not self._is_loaded:
            self.load()
        return self.forecasts_df

    def get_paired(self) -> pd.DataFrame:
        if not self._is_loaded:
            self.load()
        return self.paired_df

    def get_metadata(self) -> dict:
        if not self._is_loaded:
            self.load()
        return self.metadata


# Global singleton instance
store = DataStore()
