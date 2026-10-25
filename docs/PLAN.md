# Project Execution Plan & Phase Tracking Checklist
## UK Wind Forecast Monitoring & Decision Portal (January 2026)

**Target Time Cap:** 16.0 Hours  
**Execution Mode:** Sequential Phase Gates (Verify -> Log -> Proceed)

---

### Phase Status Overview

| Phase | Description | Est. Time | Status | Completed At |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 0** | Setup, Discovery & Repo Initialization | 1.0h | **Done** | 2026-10-25 |
| **Phase 1** | Ingestion, Cleaning & Parquet Snapshot Pipeline | 2.5h | **Done** | 2026-10-25 |
| **Phase 2** | Core Analytics Engine & FastAPI Services | 3.0h | **Done** | 2026-10-25 |
| **Phase 3** | Frontend Foundation & Trading Theme | 2.0h | **Done** | 2026-10-25 |
| **Phase 4** | Trading Portal UI & Decision Support Views | 3.0h | **Done** | 2026-10-25 |
| **Phase 5** | Containerization, Hardening & CI/CD | 1.5h | **Done** | 2026-10-25 |
| **Phase 6** | Public Deployment & Verification | 1.0h | **Next Up** | - |
| **Phase 7** | Documentation, AI Transparency & Polish | 0.75h | Pending | - |
| **Phase 8** | 10-Minute Presentation Video Recording | 2.0h | Pending | - |

---

### Phase 0 Checklist: Setup & Discovery (DONE)
- [x] Configure `.gitignore`
- [x] Set up `.env.example`
- [x] Initialize project directory scaffolding
- [x] Run live connectivity test against Elexon BMRS API (HTTP 200 OK on both endpoints)
- [x] Save sample API JSON responses under `backend/data/raw/samples/`
- [x] Document verified schemas in `docs/ARCHITECTURE.md`

### Phase 1 Checklist: Data Ingestion & Snapshot Pipeline (DONE)
- [x] Set up Python environment: uv venv + 50 packages installed (pandas, pyarrow, fastapi, httpx, tenacity, pytest, etc.)
- [x] Built `pipeline/ingest.py`: chunked fetcher (3-day FUELHH chunks, 12-hour WINDFOR chunks) with httpx retry + local JSON disk cache
- [x] Built `pipeline/clean.py`: UTC parsing, WIND filter, dedup, horizon calc (0-48h), pairing, error sign convention
- [x] Built `pipeline/mock_generator.py`: realistic synthetic January 2026 data (diurnal + synoptic patterns)
- [x] Built `pipeline/build_snapshot.py`: master orchestrator producing Parquet + metadata.json
- [x] Wrote 20 unit tests in `tests/test_pipeline.py` — all passing
- [x] **Live Elexon API ingestion completed successfully**:
  - FUELHH: 41,280 raw → 1,488 WIND actuals (100% January coverage, 0 missing periods)
  - WINDFOR: 20,440 raw → 11,873 valid forecast vintages (horizon 0-48h, January targets only)
  - Paired: 11,873 forecast-actual matched records
  - Parquet snapshots: actuals (26 KB), forecasts (77 KB), paired (276 KB)
  - All data cached to disk for instant re-runs

### Phase 2 Checklist: Core Analytics Engine & FastAPI (DONE)
- [x] Implemented `app/config.py`: typed configuration, data paths, benchmark spread (£85/MWh), CORS
- [x] Implemented `app/data_store.py`: in-memory Parquet loader (<30ms query latency, zero external runtime dependencies)
- [x] Implemented `app/schemas.py`: complete Pydantic v2 schemas for all response models
- [x] Implemented `app/services/selection.py`:
  - Strict Day-Ahead auction cutoff logic on D-1
  - UTC timestamp conversion across `Europe/London` timezone
  - Zero look-ahead leakage enforcement (ignores any forecast published after cutoff)
  - Hourly-to-half-hourly settlement period mapping
- [x] Implemented `app/services/metrics.py`:
  - Mathematical formulas for MAE, RMSE, MBE (Bias), nMAE
  - MAPE with 100 MW capacity floor (avoids zero division on calm periods)
  - Signed error quantiles ($P_5, P_{10}, P_{25}, P_{50}, P_{75}, P_{90}, P_{95}$)
  - Horizon lead-time decay bucketing (0-48h)
  - Daily timeseries error aggregation
- [x] Implemented `app/services/risk.py`:
  - Leave-One-Day-Out (LODO) cross-validation empirical risk buffer
  - Excludes target delivery day $D$ from training set
  - Downside $P_{10}$ shortfall and upside $P_{90}$ confidence bounds
  - Downside financial imbalance exposure (£) using benchmark £85/MWh spread
- [x] Implemented FastAPI endpoints in `app/routers/`:
  - `GET /api/v1/forecast/dayahead`: Cutoff-governed forecast with LODO risk buffer
  - `GET /api/v1/forecast/vintages`: Multi-vintage lead-time evolution
  - `GET /api/v1/accuracy/summary`: High-level KPI metrics with filters
  - `GET /api/v1/accuracy/by-horizon`: Horizon error dynamics across 0-48h lead times
  - `GET /api/v1/accuracy/timeseries`: Daily accuracy progression
  - `GET /api/v1/meta`: Dataset audit and completeness status
  - `GET /health` & `GET /`: Liveness and OpenAPI documentation
- [x] Comprehensive test suite in `backend/tests/`:
  - 39 tests passing (100% pass rate)
  - 90% code coverage across all core services (`app/services`)

### Phase 3 & 4 Checklist: Frontend Foundation & Trading Portal Views (DONE)
- [x] Initialized Vite + React 19 + TypeScript + TailwindCSS v4 with clean architecture
- [x] Built Bloomberg-style dark mode trading theme (`#07090e`, cyan `#06B6D4`, amber `#F59E0B`, emerald `#10B981`)
- [x] Enforced strict tabular numerals (`font-variant-numeric: tabular-nums`) across all metrics
- [x] Created typed API client in `frontend/src/api/client.ts` matching backend Pydantic models
- [x] Implemented `DecisionView.tsx`:
  - 48 settlement periods dual-line chart (Day-Ahead Forecast vs Actual Generation)
  - Shaded $P_{10}$ to $P_{90}$ Leave-One-Day-Out empirical confidence band
  - Reactive `CutoffSlider` (06:00 to 14:00 UK time with auction gate presets)
  - `DateSelector` with previous/next arrows and event presets (High Wind, Calm, Storm Isha)
  - KPI Cards: Total Forecast Energy (GWh), Recommended Risk Buffer (MW), Downside Imbalance Risk (£), Outturn (GWh)
  - Lead-time Vintage Convergence inspector on period click
  - "Download Day Schedule (CSV)" export for trading desks
- [x] Implemented `AccuracyView.tsx`:
  - Horizon Error Decay chart across lead times (0h–48h) with selectable 1h/2h/4h steps
  - Daily accuracy trajectory over all 31 days of January
  - Empirical signed error quantiles ($P_5$ to $P_{95}$)
  - Summary KPI cards (MAE, RMSE, Bias, nMAE, MAPE)
- [x] Implemented `Methodology.tsx`:
  - Operational GB auction gate-closure context
  - Mathematical error and risk formulas
  - LODO cross-validation methodology
  - Full data audit report (1,488 periods, 100% January coverage, 0 missing intervals)
- [x] Verified build: `pnpm build` completed in 1.34s with zero TypeScript errors or warnings.

### Phase 5 Checklist: Containerization, Hardening & CI/CD (DONE)
- [x] `backend/Dockerfile`: Production Python 3.11 container with non-root user `appuser`, curl healthcheck, and baked-in Parquet snapshots
- [x] `frontend/Dockerfile`: Multi-stage build with Nginx Alpine serving static assets with gzip compression
- [x] `frontend/nginx.conf`: Reverse proxy configuration routing `/api` to backend and handling SPA navigation
- [x] `docker-compose.yml`: Local unified deployment orchestration uniting backend (8000) and frontend (3000)
- [x] `.dockerignore` for both frontend and backend preventing unwanted cache/module transfers
- [x] `.github/workflows/ci.yml`: GitHub Actions automated pipeline testing backend (pytest + 85% coverage threshold) and frontend (`pnpm build`)
- [x] Verified local build: `docker compose build` built both images cleanly.
