"""Génère frontend/src/data/showcase.ts : séries mensuelles compactes pour le hero.

Permet à la page d'accueil d'afficher de vraies courbes 10 ans INSTANTANÉMENT,
sans attendre le réveil du backend (plan gratuit Render). À régénérer après
`build_seed_snapshot.py` :  python scripts/build_showcase.py
"""

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).parent.parent
SNAP = ROOT / "data" / "etf_history_seed.csv.gz"
OUT = ROOT.parent / "frontend" / "src" / "data" / "showcase.ts"

# ETF vitrine (ordre = ordre d'affichage). hero=True → courbe principale.
SHOWCASE = [
    ("CW8.PA", "Amundi MSCI World", "MSCI World", True),
    ("PUST.PA", "Amundi PEA S&P 500", "S&P 500", False),
    ("PANX.PA", "Amundi PEA Nasdaq-100", "Nasdaq-100", False),
    ("PAEEM.PA", "Amundi PEA Emerging", "MSCI Emerging", False),
    ("RS2K.PA", "Amundi Russell 2000", "Russell 2000", False),
    ("GLD", "SPDR Gold Shares", "Or", False),
]
N_MONTHS = 120


def main() -> int:
    df = pd.read_csv(SNAP, compression="gzip", parse_dates=["date"])
    items = []
    for ticker, nom, indice, hero in SHOWCASE:
        sub = df[df["ticker"] == ticker.upper()].copy()
        if sub.empty:
            print(f"  ✗ {ticker}: absent du snapshot")
            continue
        sub = sub.set_index("date").sort_index()
        monthly = sub["close"].resample("MS").last().dropna().tail(N_MONTHS)
        points = [{"d": d.strftime("%Y-%m"), "c": round(float(v), 2)} for d, v in monthly.items()]
        items.append(
            {"ticker": ticker, "nom": nom, "indice": indice, "hero": hero, "points": points}
        )
        print(f"  ✓ {ticker}: {len(points)} points mensuels")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(items, ensure_ascii=False, indent=2)
    OUT.write_text(
        "// Généré par backend/scripts/build_showcase.py — NE PAS éditer à la main.\n"
        "// Vraies séries mensuelles (snapshot) pour un hero instantané.\n"
        "export interface ShowcasePoint { d: string; c: number }\n"
        "export interface ShowcaseEtf {\n"
        "  ticker: string; nom: string; indice: string; hero: boolean; points: ShowcasePoint[];\n"
        "}\n"
        f"export const SHOWCASE: ShowcaseEtf[] = {body};\n",
        encoding="utf-8",
    )
    kb = OUT.stat().st_size / 1024
    print(f"\n✅ {len(items)} ETF → {OUT} ({kb:.0f} Ko)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
