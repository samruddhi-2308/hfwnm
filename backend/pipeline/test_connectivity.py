"""
Test script to probe Elexon BMRS API endpoints for FUELHH and WINDFOR.
Saves sample JSON responses in backend/data/raw/samples/
"""
import json
import urllib.request
import urllib.error
from pathlib import Path

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "data" / "raw" / "samples"
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "UK-Wind-Monitoring-Portal/1.0 (academic-research)"
}

def test_fuelhh():
    print("[1/2] Testing FUELHH stream endpoint...")
    url = (
        "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream"
        "?settlementDateFrom=2026-01-01&settlementDateTo=2026-01-01&format=json"
    )
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"  Status: {resp.status}")
            print(f"  Records fetched: {len(data)}")
            # Filter for wind sample
            wind_sample = [r for r in data if r.get("fuelType") == "WIND"]
            print(f"  Wind records found: {len(wind_sample)}")
            if wind_sample:
                print(f"  First wind record: {wind_sample[0]}")
            sample_path = SAMPLE_DIR / "fuelhh_sample.json"
            with open(sample_path, "w", encoding="utf-8") as f:
                json.dump(data[:10], f, indent=2)
            print(f"  Saved sample to {sample_path}")
            return True, len(data)
    except Exception as e:
        print(f"  Error accessing FUELHH endpoint: {e}")
        return False, str(e)

def test_windfor():
    print("\n[2/2] Testing WINDFOR stream endpoint...")
    url = (
        "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream"
        "?publishDateTimeFrom=2026-01-01T00:00:00Z&publishDateTimeTo=2026-01-01T04:00:00Z&format=json"
    )
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"  Status: {resp.status}")
            print(f"  Records fetched: {len(data)}")
            if data:
                print(f"  First forecast record: {data[0]}")
            sample_path = SAMPLE_DIR / "windfor_sample.json"
            with open(sample_path, "w", encoding="utf-8") as f:
                json.dump(data[:10], f, indent=2)
            print(f"  Saved sample to {sample_path}")
            return True, len(data)
    except Exception as e:
        print(f"  Error accessing WINDFOR endpoint: {e}")
        return False, str(e)

if __name__ == "__main__":
    print("=== Elexon BMRS API Discovery & Connectivity Test ===")
    fuel_ok, fuel_res = test_fuelhh()
    wind_ok, wind_res = test_windfor()
    print("\nSummary:")
    print(f"  FUELHH: {'SUCCESS' if fuel_ok else 'FAILED'} ({fuel_res})")
    print(f"  WINDFOR: {'SUCCESS' if wind_ok else 'FAILED'} ({wind_res})")
