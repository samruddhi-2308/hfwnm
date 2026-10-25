"""
FastAPI application entrypoint for the UK Wind Forecast Monitoring & Decision Portal.

Provides institutional-grade operational trading endpoints, mathematical evaluation metrics,
and Parquet snapshot-backed low-latency responses.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.data_store import store
from app.routers import forecast, accuracy, meta


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load Parquet datasets into memory at application startup."""
    # Pre-warm in-memory data store (<50ms)
    store.load()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Operational Day-Ahead Wind Forecast Monitoring & Imbalance Risk Portal (January 2026)",
    lifespan=lifespan,
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(forecast.router, prefix=settings.api_prefix)
app.include_router(accuracy.router, prefix=settings.api_prefix)
app.include_router(meta.router, prefix=settings.api_prefix)


@app.get("/health")
def health_check():
    """Liveness probe for containerized deployments and orchestrators."""
    return {"status": "ok", "app": settings.app_name, "environment": settings.environment}


@app.get("/")
def root():
    """Root info pointing to OpenAPI interactive documentation."""
    return {
        "portal": settings.app_name,
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "api_v1": settings.api_prefix,
    }
