"""Génère le snapshot d'historiques (data/etf_history_seed.csv.gz).

À lancer depuis une machine NON bloquée par Yahoo (poste local, pas un datacenter) :

    python scripts/build_seed_snapshot.py

Le snapshot permet au backend déployé de servir de vraies données immédiatement,
sans dépendre de Yahoo Finance (souvent bloqué depuis les IP d'hébergeurs gratuits).
"""

import csv
import sys
from pathlib import Path

import pandas as pd
import yfinance as yf

ROOT = Path(__file__).parent.parent
META = ROOT / "etf_metadata.csv"
OUT = ROOT / "data" / "etf_history_seed.csv.gz"


def main() -> int:
    tickers = [row["ticker"] for row in csv.DictReader(open(META, encoding="utf-8"))]
    frames = []
    for t in tickers:
        try:
            h = yf.Ticker(t).history(period="10y", auto_adjust=True)
        except Exception as e:  # noqa: BLE001
            print(f"  ✗ {t}: {e}")
            continue
        if h.empty:
            print(f"  ✗ {t}: vide")
            continue
        if h.index.tz is not None:
            h.index = h.index.tz_convert(None)
        df = pd.DataFrame(
            {
                "ticker": t.upper(),
                "date": h.index.date,
                "open": h["Open"].values,
                "high": h["High"].values,
                "low": h["Low"].values,
                "close": h["Close"].values,
                "adj_close": h["Close"].values,  # auto_adjust=True
                "volume": h["Volume"].values,
            }
        )
        frames.append(df)
        print(f"  ✓ {t}: {len(df)} lignes")

    if not frames:
        print("Aucune donnée récupérée.", file=sys.stderr)
        return 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    full = pd.concat(frames, ignore_index=True)
    full.to_csv(OUT, index=False, compression="gzip")
    size_kb = OUT.stat().st_size / 1024
    print(f"\n✅ {len(full)} lignes · {full['ticker'].nunique()} ETF → {OUT} ({size_kb:.0f} Ko)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
