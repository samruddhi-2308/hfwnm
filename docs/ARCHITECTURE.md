# System Architecture & Technical Specifications
## UK Wind Forecast Monitoring & Decision Portal (January 2026)

---

## 1. Verified Data Source Contracts (Elexon BMRS API)

Live connectivity verified on **2026-10-25**. Both endpoints return open JSON without requiring an API key.

### 1.1 Outturn Actual Generation (`FUELHH/stream`)
- **Base URL:** `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream`
- **Query Parameters:**
  - `settlementDateFrom`: `YYYY-MM-DD` (inclusive)
  - `settlementDateTo`: `YYYY-MM-DD` (inclusive)
  - `format`: `json`
- **Verified Record Structure:**
  ```json
  {
    "dataset": "FUELHH",
    "publishTime": "2026-01-02T00:00:00Z",
    "startTime": "2026-01-01T23:30:00Z",
    "settlementDate": "2026-01-01",
    "settlementPeriod": 48,
    "fuelType": "WIND",
    "generation": 15538
  }
  ```
- **Filter Rule:** Filter strictly on `fuelType == "WIND"`. Each complete day provides exactly 48 half-hour settlement periods.

### 1.2 Forecast Generation Vintages (`WINDFOR/stream`)
- **Base URL:** `https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream`
- **Query Parameters:**
  - `publishDateTimeFrom`: `YYYY-MM-DDTHH:mm:ssZ`
  - `publishDateTimeTo`: `YYYY-MM-DDTHH:mm:ssZ`
  - `format`: `json`
- **Verified Record Structure:**
  ```json
  {
    "dataset": "WINDFOR",
    "publishTime": "2026-01-01T02:30:00Z",
    "startTime": "2025-12-31T21:00:00Z",
    "generation": 19498
  }
  ```
- **Processing Rule:** Each record is one forecast vintage. `horizon_hours = (startTime - publishTime).total_seconds() / 3600`. Discard records where `horizon_hours < 0` or `horizon_hours > 48`.

---

## 2. Core Architectural Principles

1. **Decoupled Offline Ingestion:**
   The production app does not call external APIs during user requests. Ingestion runs via `pipeline/build_snapshot.py`, compiling raw data into compressed Apache Parquet tables under `backend/data/processed/`.
2. **Leak-Free Decision Selection:**
   Given a delivery day $D$ and decision cutoff time $C$ (default 09:00 UK on $D-1$), the selection engine strictly queries `publishTime <= cutoff_utc`. Newer vintages published after $C$ are ignored for the day-ahead schedule.
3. **Leave-One-Day-Out (LODO) Cross Validation:**
   Quantile bands ($P_{10}$ downside, $P_{90}$ upside) for delivery day $D$ are computed strictly using error distributions from the remaining days of January 2026 to prevent look-ahead bias.
4. **Sub-30ms Serving Architecture:**
   FastAPI loads the processed Parquet snapshot into memory at startup. In-memory analytical queries execute instantaneously with zero external network overhead.
