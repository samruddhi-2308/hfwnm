# UK National Wind Forecast Monitoring & Imbalance Risk Portal
### January 2026 Operational Decision Support System for Great Britain Power Desks

[![CI/CD Pipeline](https://github.com/samruddhi-2308/hfwnm/actions/workflows/ci.yml/badge.svg)](https://github.com/samruddhi-2308/hfwnm/actions/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![Dataset Health](https://img.shields.io/badge/January%202026%20Coverage-100%25%20(1%2C488%20SPs)-10B981.svg)](https://data.elexon.co.uk/bmrs/api/v1)

---

## 1. Executive Summary & Problem Setting

### 1.1 The Client Challenge
The client is a United Kingdom electricity utility responsible for procuring wholesale power to meet consumer demand. While renewable wind generation provides low marginal cost power, it is weather-dependent and non-dispatchable. 

Wholesale power purchases for delivery Day D must be committed in day-ahead auctions on Day D-1 (e.g., Nord Pool and EPEX Spot UK), where auction gate closure clears between 09:00 and 11:00 UK local time.

The power procurement desk faces two operational imperatives:
1. **Decision Gate Forecast Clarity**: Ascertain the exact renewable wind generation forecasts genuinely available at auction gate closure, strictly avoiding post-gate forecast leakage.
2. **Quantified Uncertainty & Imbalance Risk**: Quantify forecast error dynamics so the desk knows precisely how much firm wind power to commit and how much supplemental power (e.g., flexible gas peakers, pumped storage, or interconnectors) to procure as a backup buffer to prevent punitive System Buy Price (SBP) cashout penalties if wind under-delivers.

### 1.2 The Operational Solution
This portal is a full-stack decision-support system built exclusively on Elexon BMRS national datasets (`FUELHH` actuals and `WINDFOR` forecasts) for January 2026. It couples a temporal decision-cutoff engine with a Leave-One-Day-Out (LODO) empirical quantile risk framework, providing energy traders with real-time hedge recommendations in Megawatts (MW) and financial imbalance exposure in Pounds Sterling (£).

---

## 2. Core Capabilities & Decision Desk Features

### A. Temporal Decision Cutoff Engine (Zero Look-Ahead Leakage)
* In real operations, a trader placing bids at 09:30 on D-1 cannot use forecasts published at 22:00 on D-1.
* The portal features an interactive cutoff engine (defaulting to 09:00 UK local time on D-1).
* For each half-hour Settlement Period (SP 1 to 48) on Day D, the backend algorithm filters all historical forecast vintages:
  $$\text{publish\_time\_utc} \le t_{\text{cutoff\_utc}}$$
  and selects the most recent vintage available prior to that decision boundary.

### B. Actionable Wind Risk Buffer & Imbalance Protection
* Rather than relying on static historical averages, the system applies **Leave-One-Day-Out (LODO) cross-validation**: when assessing delivery Day D, all actuals from Day D are strictly excluded from the training distribution.
* Evaluates the empirical 10th percentile error ($e_{P10}$ downside shortfall) for each settlement period.
* Directly prescribes operational actions:
  * **Forecast Generation (MW)**: Point forecast at decision cutoff.
  * **Recommended Hedge Buffer (MW)**: $|e_{P10}|$ shortfall buffer to procure from flexible thermal assets.
  * **Firm Wind Bid (MW)**: $\max(0, \text{Forecast} - \text{Buffer})$.
  * **Downside Imbalance Exposure (£)**: Financial liability under benchmark £85/MWh cashout spread conditions.

### C. Horizon Error Decay Dynamics (0h to 48h)
* Quantifies empirical forecast accuracy decay across lead times from 0 to 48 hours.
* Demonstrates how forecast uncertainty widens as the lead horizon extends, establishing the quantitative business case for intraday trading and re-hedging.

### D. Institutional Trading Terminal Interface
* Built with an institutional slate palette (`#0B0F19` canvas, `#111625` cards) and strict tabular numerals (`font-variant-numeric: tabular-nums`).
* Interactive toggle between **Macro Confidence Curve** (Recharts SVG fan chart showing $P_{10}$ to $P_{90}$ envelope) and a **48-Period Settlement Ledger** with CSV export.
* Preset quick-filters for significant January 2026 weather regimes (Jan 15 High Wind, Jan 19 Calm/Dunkelflaute, Jan 21 Storm Isha).

---

## 3. Mathematical Formulations

| Metric | Mathematical Definition | Operational Meaning |
| :--- | :--- | :--- |
| **Signed Error** ($e_t$) | $e_t = y_t - \hat{y}_t$ | Positive = Overdelivery (Long), Negative = Shortfall (Short position) |
| **Mean Absolute Error (MAE)** | $\frac{1}{N} \sum_{t=1}^N \|y_t - \hat{y}_t\|$ | Average absolute deviation magnitude across paired periods (MW) |
| **Root Mean Squared Error (RMSE)** | $\sqrt{\frac{1}{N} \sum_{t=1}^N (y_t - \hat{y}_t)^2}$ | Penalizes large tail errors; proxy for dispatch volatility and grid stress |
| **Mean Bias Error (MBE)** | $\frac{1}{N} \sum_{t=1}^N (y_t - \hat{y}_t)$ | Identifies whether forecasts have net systemic over- or under-forecasting bias |
| **Normalized MAE (nMAE)** | $\frac{\text{MAE}}{\bar{y}}$ | Scale-independent error normalized by average national wind generation |
| **MAPE (100 MW Floor)** | $\frac{1}{\|T_{\ge 100}\|} \sum_{t \in T_{\ge 100}} \frac{\|y_t - \hat{y}_t\|}{y_t} \times 100\%$ | Percentage error with a 100 MW capacity floor to prevent division instability during calm wind |
| **LODO Risk Buffer** | $\|e_{P10}\|$ derived from $\{d \in \text{Jan 2026} \setminus D\}$ | Recommended flexible thermal capacity to hold in reserve |
| **Downside Imbalance Exposure** | $\text{Buffer (MW)} \times 0.5\text{ h} \times \text{£85/MWh}$ | Financial cashout exposure mitigated by the hedge strategy |

---

## 4. System Architecture & Tech Stack

```
+-----------------------------------------------------------------------+
|                         Data Pipeline Layer                           |
|  Elexon BMRS API Ingestion -> Validation & Pairing -> Parquet Storage |
+-----------------------------------┬-----------------------------------+
                                    | High-speed load at boot (<30ms)
+-----------------------------------v-----------------------------------+
|                     FastAPI Backend (Python 3.11)                     |
|  - In-Memory DuckDB / Pandas Analytical Store                         |
|  - Cutoff Engine (/api/v1/forecast/dayahead)                          |
|  - LODO Risk Service (/api/v1/risk/buffer)                            |
|  - Accuracy Metrics Service (/api/v1/accuracy/*)                      |
|  - Robust Schema Validation with Pydantic v2                          |
+-----------------------------------┬-----------------------------------+
                                    | REST JSON API (CORS enabled)
+-----------------------------------v-----------------------------------+
|                   Frontend (React 19 + TypeScript)                    |
|  - Institutional Slate Theme with Tabular Numerals                    |
|  - Recharts Fan Chart with P10-P90 Risk Envelope                      |
|  - Interactive Cutoff Slider & Settlement Ledger                      |
|  - Single-click CSV Export for Downstream Trading Models              |
+-----------------------------------------------------------------------+
```

### Component Details
* **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4, Recharts, Lucide Icons.
* **Backend**: Python 3.11, FastAPI, Pandas, DuckDB, NumPy, Pydantic v2, PyArrow, Uvicorn.
* **DevOps**: Multi-stage Dockerfiles, Docker Compose, GitHub Actions CI testing pipeline.

---

## 5. Dataset Audit Trail & Integrity

To limit the scope strictly to the project brief, national-level data from Elexon BMRS was ingested for all of January 2026:

* **Actual Generation (`FUELHH`)**:
  * Ingested stream: `fuelType = "WIND"`
  * Cleaned records: Exactly **1,488 half-hour Settlement Periods** across 31 days.
  * Audit result: **100.0% completeness with 0 missing intervals**.
* **Forecast Generation (`WINDFOR`)**:
  * Ingested stream: `startTime` (half-hourly resolution) and `publishTime` (hourly publication cycle).
  * Validated horizon span: $0\text{h} \le \text{lead time} \le 48\text{h}$.
  * Cleaned records: Exactly **11,873 valid forecast vintages**.
* **Offline Snapshot Performance**:
  * Cleaned datasets are committed as compressed Apache Parquet snapshots (~379 KB total).
  * Eliminates external network fragility, rate limits, or Elexon gateway outages during client evaluations.
  * Backend API endpoints deliver sub-30ms response times.

---

## 6. Quick Start & Execution Guide

### Option 1: Docker Compose (Single Command)

Ensure Docker Desktop is running, then execute:

```bash
docker compose up --build
```

Access services:
* **Web Trading Portal**: `http://localhost:3000`
* **FastAPI Backend Documentation**: `http://localhost:8000/docs`
* **Health Check**: `http://localhost:8000/health`

### Option 2: Standalone Local Development

#### Backend Setup:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
pip install pytest pytest-cov

# Run full test suite with coverage
pytest tests/ -v --cov=app/services

# Launch development server
uvicorn app.main:app --reload --port 8000
```

#### Frontend Setup:
```bash
cd frontend
npm install
npm run build   # Type-check and production bundle build
npm run dev     # Starts development server on http://localhost:5173
```

---

## 7. AI Tools Disclosure & Attribution

In accordance with project guidelines, AI assistance was utilized transparently during the development of this portal:

* **AI Coding Assistants Used**: Google DeepMind Antigravity IDE (Claude Opus 4.6 agentic model).
* **Delegation Scope**:
  1. *Boilerplate Scaffolding*: Generating initial Pydantic response models and TypeScript interface types.
  2. *Testing*: Generating comprehensive parameter matrices for unit tests across settlement periods 1 to 48.
  3. *Refactoring*: Converting chart tooltips and high-density table components into reusable modular React components.
* **Human Engineering & Verification**:
  1. *Domain Logic*: Formulating the Great Britain auction gate-closure problem, D-1 time conversion, and the LODO risk cross-validation algorithm.
  2. *Data Integrity*: Auditing raw Elexon BMRS timestamps to prevent half-hourly vs hourly alignment bugs.
  3. *Code Review & Quality Assurance*: 100% of generated code was reviewed, validated, and verified with 39 automated unit and integration tests achieving 90% service coverage.

---

## 8. Verification & Test Suite Summary

The system includes automated tests covering core services and API routes:

* **Test Suite**: 39 automated test cases (`pytest tests/ -v`).
* **Test Coverage**: 90% coverage across core backend services (`selection.py`, `risk.py`, `metrics.py`, `forecast.py`).
* **Frontend Verification**: TypeScript type-check and Vite production bundling verified with 0 errors (`npm run build`).
