import csv
from datetime import date, timedelta
from pathlib import Path
from typing import List

import pandas as pd
import yfinance as yf
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from models.etf import ETF, CoursHistorique

_METADATA_PATH = Path(__file__).parent.parent / "etf_metadata.csv"
_PERIOD_DAYS = {"1y": 365, "3y": 1095, "10y": 3650}


def _load_metadata() -> dict:
    if not _METADATA_PATH.exists():
        return {}
    with open(_METADATA_PATH, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    result = {}
    for row in rows:
        row["eligible_pea"] = row.get("eligible_pea", "false").lower() == "true"
        row["ter"] = float(row["ter"]) if row.get("ter") else None
        result[row["ticker"]] = row
    return result


_METADATA: dict = _load_metadata()


def get_or_create_etf(ticker: str, db: Session) -> ETF:
    """
    Retourne l'ETF correspondant au ticker, en le créant depuis etf_metadata.csv si absent.

    Args:
        ticker: Ticker yfinance (ex: 'CW8.PA').
        db: Session SQLAlchemy.

    Returns:
        Instance ETF (existante ou nouvellement créée).
    """
    ticker = ticker.upper()
    etf = db.query(ETF).filter(ETF.ticker == ticker).first()
    if etf:
        return etf

    meta = _METADATA.get(ticker, {})
    etf = ETF(
        ticker=ticker,
        nom=meta.get("nom"),
        indice=meta.get("indice"),
        gestionnaire=meta.get("gestionnaire"),
        ter=meta.get("ter"),
        eligible_pea=meta.get("eligible_pea"),
        devise=meta.get("devise", "EUR"),
    )
    db.add(etf)
    db.commit()
    db.refresh(etf)
    return etf


def _is_fresh(db: Session, etf_id: int) -> bool:
    """Retourne True si cours_historique contient des données datant de moins de 24h."""
    latest = (
        db.query(CoursHistorique)
        .filter(CoursHistorique.etf_id == etf_id)
        .order_by(CoursHistorique.date.desc())
        .first()
    )
    if not latest:
        return False
    return (date.today() - latest.date).days < 1


def _fetch_and_store(ticker: str, etf_id: int, db: Session) -> None:
    """Télécharge 10 ans d'historique via yfinance et effectue un upsert en BDD."""
    hist: pd.DataFrame = yf.Ticker(ticker).history(period="10y", auto_adjust=True)
    if hist.empty:
        raise ValueError(f"yfinance n'a retourné aucune donnée pour '{ticker}'")

    if hist.index.tz is not None:
        hist.index = hist.index.tz_convert(None)

    rows = [
        {
            "etf_id": etf_id,
            "date": ts.date(),
            "open": float(row.get("Open")) if row.get("Open") is not None else None,
            "high": float(row.get("High")) if row.get("High") is not None else None,
            "low": float(row.get("Low")) if row.get("Low") is not None else None,
            "close": float(row["Close"]),
            "adj_close": float(row["Close"]),  # auto_adjust=True → Close est déjà ajusté
            "volume": int(row["Volume"]) if row.get("Volume") is not None else None,
        }
        for ts, row in hist.iterrows()
    ]

    stmt = insert(CoursHistorique.__table__).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["etf_id", "date"],
        set_={
            "open": stmt.excluded.open,
            "high": stmt.excluded.high,
            "low": stmt.excluded.low,
            "close": stmt.excluded.close,
            "adj_close": stmt.excluded.adj_close,
            "volume": stmt.excluded.volume,
        },
    )
    db.execute(stmt)
    db.commit()


def _rows_to_dataframe(rows: List[CoursHistorique]) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame(columns=["adj_close", "open", "high", "low", "close", "volume"])
    data = {
        "date": [r.date for r in rows],
        "open": [r.open for r in rows],
        "high": [r.high for r in rows],
        "low": [r.low for r in rows],
        "close": [r.close for r in rows],
        "adj_close": [r.adj_close for r in rows],
        "volume": [r.volume for r in rows],
    }
    df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["date"])
    return df.set_index("date")


def get_historique(ticker: str, period: str, db: Session) -> pd.DataFrame:
    """
    Retourne un DataFrame de l'historique de cours pour la période donnée.
    Déclenche un fetch yfinance si les données en BDD sont absentes ou > 24h.

    Args:
        ticker: Ticker yfinance (ex: 'CW8.PA').
        period: '1y', '3y' ou '10y'.
        db: Session SQLAlchemy.

    Returns:
        DataFrame avec DatetimeIndex et colonnes adj_close, open, high, low, close, volume.

    Raises:
        ValueError: Si la période est invalide ou si yfinance ne retourne aucune donnée.
    """
    if period not in _PERIOD_DAYS:
        raise ValueError(f"Période invalide : '{period}'. Valeurs acceptées : {list(_PERIOD_DAYS)}")

    etf = get_or_create_etf(ticker, db)
    if not _is_fresh(db, etf.id):
        _fetch_and_store(ticker, etf.id, db)

    cutoff = date.today() - timedelta(days=_PERIOD_DAYS[period])
    rows = (
        db.query(CoursHistorique)
        .filter(CoursHistorique.etf_id == etf.id, CoursHistorique.date >= cutoff)
        .order_by(CoursHistorique.date.asc())
        .all()
    )
    return _rows_to_dataframe(rows)


def get_historique_by_dates(
    ticker: str, date_debut: date, date_fin: date, db: Session
) -> pd.DataFrame:
    """
    Retourne un DataFrame filtré par dates explicites.
    Déclenche un fetch yfinance si les données en BDD sont absentes ou > 24h.

    Args:
        ticker: Ticker yfinance (ex: 'CW8.PA').
        date_debut: Date de début (incluse).
        date_fin: Date de fin (incluse).
        db: Session SQLAlchemy.

    Returns:
        DataFrame avec DatetimeIndex et colonnes adj_close, open, high, low, close, volume.
    """
    etf = get_or_create_etf(ticker, db)
    if not _is_fresh(db, etf.id):
        _fetch_and_store(ticker, etf.id, db)

    rows = (
        db.query(CoursHistorique)
        .filter(
            CoursHistorique.etf_id == etf.id,
            CoursHistorique.date >= date_debut,
            CoursHistorique.date <= date_fin,
        )
        .order_by(CoursHistorique.date.asc())
        .all()
    )
    return _rows_to_dataframe(rows)


def get_derniere_date_cours(etf_id: int, db: Session):
    """Retourne la date la plus récente dans cours_historique pour un ETF donné."""
    result = db.query(func.max(CoursHistorique.date)).filter(CoursHistorique.etf_id == etf_id).scalar()
    return result
