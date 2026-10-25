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
| **Phase 2** | Core Analytics Engine & FastAPI Services | 3.0h | **Next Up** | - |
| **Phase 3** | Frontend Foundation & Trading Theme | 2.0h | Pending | - |
| **Phase 4** | Trading Portal UI & Decision Support Views | 3.0h | Pending | - |
| **Phase 5** | Containerization, Hardening & CI/CD | 1.5h | Pending | - |
| **Phase 6** | Public Deployment & Verification | 1.0h | Pending | - |
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

### Phase 2 Checklist: Core Analytics Engine & FastAPI (Next)
- [ ] Implement `app/services/selection.py` (day-ahead cutoff selection algorithm)
- [ ] Implement `app/services/metrics.py` (MAE, RMSE, Bias, nMAE, MAPE, percentiles)
- [ ] Implement `app/services/risk.py` (LODO cross-validation risk buffer)
- [ ] Build FastAPI app with Pydantic v2 schemas, routers, CORS
- [ ] Unit tests with hand-calculated fixtures (>90% coverage on services)
