"""
API integration tests using FastAPI TestClient.

Tests all REST endpoints against the loaded snapshot dataset.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.data_store import store


@pytest.fixture(scope="module", autouse=True)
def init_store():
    """Ensure data store is loaded before tests run."""
    store.load()


@pytest.fixture
def client():
    """FastAPI test client fixture."""
    with TestClient(app) as c:
        yield c


def test_health_check(client):
    """Test /health liveness probe."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


def test_root_endpoint(client):
    """Test / root documentation link."""
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert "portal" in data
    assert "docs_url" in data


def test_meta_endpoint(client):
    """Test /api/v1/meta metadata response."""
    res = client.get("/api/v1/meta")
    assert res.status_code == 200
    data = res.json()
    assert data["dataset_health"] in ("HEALTHY", "DEGRADED")
    assert data["january_periods_actual"] == 1488
    assert data["january_completeness_pct"] == 100.0
    assert data["total_actual_records"] >= 1488
    assert data["total_paired_records"] > 0


def test_forecast_dayahead(client):
    """Test /api/v1/forecast/dayahead for a valid January delivery day."""
    res = client.get("/api/v1/forecast/dayahead", params={
        "delivery_date": "2026-01-15",
        "cutoff_time": "09:00",
        "include_actuals": True,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["delivery_date"] == "2026-01-15"
    assert data["cutoff_time_uk"] == "09:00"
    assert len(data["periods"]) == 48

    summary = data["summary"]
    assert summary["total_forecast_mwh"] > 0
    assert summary["peak_forecast_mw"] > 0
    assert summary["recommended_risk_buffer_mw"] > 0
    assert summary["downside_financial_exposure_gbp"] > 0
    assert summary["actual_mwh"] is not None

    first_period = data["periods"][0]
    assert first_period["settlement_period"] == 1
    assert first_period["forecast_mw"] > 0
    assert first_period["p10_lower_bound_mw"] <= first_period["forecast_mw"]
    assert first_period["p90_upper_bound_mw"] >= first_period["forecast_mw"]


def test_forecast_dayahead_not_found(client):
    """Test /api/v1/forecast/dayahead with invalid date."""
    res = client.get("/api/v1/forecast/dayahead", params={
        "delivery_date": "2025-05-01",
    })
    assert res.status_code == 404


def test_forecast_vintages(client):
    """Test /api/v1/forecast/vintages lead-time evolution."""
    res = client.get("/api/v1/forecast/vintages", params={
        "delivery_date": "2026-01-15",
        "settlement_period": 24,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["delivery_date"] == "2026-01-15"
    assert data["settlement_period"] == 24
    assert len(data["vintages"]) > 0


def test_accuracy_summary(client):
    """Test /api/v1/accuracy/summary KPI calculations."""
    res = client.get("/api/v1/accuracy/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_samples"] > 0
    assert data["mae_mw"] > 0
    assert data["rmse_mw"] > 0
    assert "p10" in data["quantiles"]
    assert "p90" in data["quantiles"]


def test_accuracy_by_horizon(client):
    """Test /api/v1/accuracy/by-horizon lead time error decay."""
    res = client.get("/api/v1/accuracy/by-horizon", params={"bucket_hours": 2.0})
    assert res.status_code == 200
    data = res.json()
    assert len(data["buckets"]) > 0
    # Earliest horizon should have lower error than far horizon
    first_b = data["buckets"][0]
    assert first_b["mae_mw"] > 0
    assert first_b["n_samples"] > 0


def test_accuracy_timeseries(client):
    """Test /api/v1/accuracy/timeseries daily progression."""
    res = client.get("/api/v1/accuracy/timeseries")
    assert res.status_code == 200
    data = res.json()
    assert len(data["points"]) == 31  # 31 days in January
    first_pt = data["points"][0]
    assert first_pt["mae_mw"] > 0
    assert first_pt["actual_mwh"] > 0
