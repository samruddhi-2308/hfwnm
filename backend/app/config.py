"""
Application configuration for the UK Wind Forecast Portal backend.
"""
from __future__ import annotations

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "processed"


class Settings(BaseSettings):
    """Application settings with environment variable override support."""

    app_name: str = "UK Wind Forecast Monitoring & Decision Portal"
    environment: str = os.getenv("ENVIRONMENT", "development")
    api_prefix: str = "/api/v1"

    # Data files
    actuals_path: Path = DATA_DIR / "actuals.parquet"
    forecasts_path: Path = DATA_DIR / "forecasts.parquet"
    paired_path: Path = DATA_DIR / "paired_all.parquet"
    metadata_path: Path = DATA_DIR / "metadata.json"

    # Operational defaults
    default_cutoff_time: str = os.getenv("DEFAULT_CUTOFF_TIME", "09:00")
    timezone_uk: str = "Europe/London"

    # Financial / Trading benchmark defaults
    # Benchmark GB system imbalance price spread proxy (£/MWh)
    benchmark_imbalance_spread_gbp: float = 85.0
    
    # Capacity floor for MAPE to prevent division explosion
    mape_capacity_floor_mw: float = 100.0

    # CORS settings
    cors_origins: list[str] = ["*"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
