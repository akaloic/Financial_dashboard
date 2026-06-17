import csv
import logging
import time
from datetime import date, timedelta
from pathlib import Path
from typing import List

import pandas as pd
import yfinance as yf
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import IS_SQLITE
from models.etf import ETF, CoursHistorique

logger = logging.getLogger("etf_fetcher")

_METADATA_PATH = Path(__file__).parent.parent / "etf_metadata.csv"
_SNAPSHOT_PATH = Path(__file__).parent.parent / "data" / "etf_history_seed.csv.gz"
_PERIOD_DAYS = {"1y": 365, "3y": 1095, "10y": 3650}

_FETCH_RETRIES = 3
_FETCH_BACKOFF = 1.5  # secondes, doublé à chaque tentative


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


def _upsert_cours(rows: List[dict], db: Session) -> None:
    """Upsert dialect-agnostique sur (etf_id, date).

    PostgreSQL et SQLite (>=3.24) supportent tous deux ``ON CONFLICT DO UPDATE`` ; on
    sélectionne le bon constructeur ``insert`` selon le dialecte du moteur courant.
    Le projet est ainsi déployable aussi bien sur Postgres (Neon/Railway) que sur un
    SQLite mono-fichier (zéro dépendance, hébergement gratuit).
    """
    if not rows:
        return
    if IS_SQLITE:
        from sqlalchemy.dialects.sqlite import insert as _insert
    else:
        from sqlalchemy.dialects.postgresql import insert as _insert

    stmt = _insert(CoursHistorique.__table__).values(rows)
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


def _has_any_cours(db: Session, etf_id: int) -> bool:
    return (
        db.query(CoursHistorique.id).filter(CoursHistorique.etf_id == etf_id).first()
        is not None
    )


def _fetch_history(ticker: str) -> pd.DataFrame:
    """Télécharge 10 ans d'historique via yfinance avec retry + backoff exponentiel.

    Yahoo Finance limite/bloque fréquemment les IP de datacenter ; le retry absorbe
    les erreurs transitoires. En cas d'échec définitif, on lève — l'appelant décide
    alors de retomber sur les données déjà en base (snapshot/stale).
    """
    last_err: Exception | None = None
    for attempt in range(_FETCH_RETRIES):
        try:
            hist = yf.Ticker(ticker).history(period="10y", auto_adjust=True)
            if not hist.empty:
                return hist
            last_err = ValueError(f"yfinance n'a retourné aucune donnée pour '{ticker}'")
        except Exception as e:  # réseau, rate-limit, parsing yfinance…
            last_err = e
        if attempt < _FETCH_RETRIES - 1:
            time.sleep(_FETCH_BACKOFF * (2**attempt))
    raise last_err or ValueError(f"Échec du téléchargement pour '{ticker}'")


def _df_to_rows(hist: pd.DataFrame, etf_id: int) -> List[dict]:
    if hist.index.tz is not None:
        hist = hist.copy()
        hist.index = hist.index.tz_convert(None)
    return [
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


def _fetch_and_store(ticker: str, etf_id: int, db: Session) -> None:
    """Télécharge 10 ans d'historique via yfinance et effectue un upsert en BDD."""
    hist = _fetch_history(ticker)
    _upsert_cours(_df_to_rows(hist, etf_id), db)


def _ensure_cours(ticker: str, etf_id: int, db: Session) -> None:
    """Garantit la présence de cours, en dégradant gracieusement.

    Stratégie : si les données sont fraîches (<24h), on ne fait rien. Sinon on tente
    un fetch yfinance. Si le fetch échoue MAIS qu'on a déjà des données en base
    (snapshot embarqué ou cache plus ancien), on sert le stale plutôt que de planter.
    On ne propage l'erreur que si la base est totalement vide pour cet ETF.
    """
    if _is_fresh(db, etf_id):
        return
    try:
        _fetch_and_store(ticker, etf_id, db)
    except Exception as e:
        if _has_any_cours(db, etf_id):
            logger.warning("yfinance KO pour %s (%s) — service des données en cache.", ticker, e)
            return
        # Dernière chance : tenter le snapshot embarqué avant d'abandonner.
        seed_history_from_snapshot(db, only_ticker=ticker)
        if _has_any_cours(db, etf_id):
            logger.warning("yfinance KO pour %s (%s) — service du snapshot embarqué.", ticker, e)
            return
        raise


def seed_history_from_snapshot(db: Session, only_ticker: str | None = None) -> int:
    """Amorce cours_historique depuis le snapshot embarqué (data/etf_history_seed.csv.gz).

    Permet à l'application de servir de vraies données *immédiatement* après déploiement,
    sans dépendre de Yahoo Finance (souvent bloqué depuis les IP d'hébergeurs gratuits).
    Idempotent : ne réécrit pas un ETF qui a déjà des cours.

    Returns:
        Nombre de lignes de cours insérées.
    """
    if not _SNAPSHOT_PATH.exists():
        return 0
    df = pd.read_csv(_SNAPSHOT_PATH, compression="gzip", parse_dates=["date"])
    inserted = 0
    for ticker, sub in df.groupby("ticker"):
        ticker = str(ticker).upper()
        if only_ticker and ticker != only_ticker.upper():
            continue
        etf = get_or_create_etf(ticker, db)
        if _has_any_cours(db, etf.id):
            continue
        rows = [
            {
                "etf_id": etf.id,
                "date": r["date"].date() if hasattr(r["date"], "date") else r["date"],
                "open": None if pd.isna(r.get("open")) else float(r["open"]),
                "high": None if pd.isna(r.get("high")) else float(r["high"]),
                "low": None if pd.isna(r.get("low")) else float(r["low"]),
                "close": float(r["close"]),
                "adj_close": float(r.get("adj_close", r["close"])),
                "volume": None if pd.isna(r.get("volume")) else int(r["volume"]),
            }
            for _, r in sub.iterrows()
        ]
        _upsert_cours(rows, db)
        inserted += len(rows)
    return inserted


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
    Déclenche un fetch yfinance si les données en BDD sont absentes ou > 24h,
    avec dégradation gracieuse vers les données en cache si Yahoo est indisponible.

    Args:
        ticker: Ticker yfinance (ex: 'CW8.PA').
        period: '1y', '3y' ou '10y'.
        db: Session SQLAlchemy.

    Returns:
        DataFrame avec DatetimeIndex et colonnes adj_close, open, high, low, close, volume.

    Raises:
        ValueError: Si la période est invalide ou si aucune donnée n'est disponible.
    """
    if period not in _PERIOD_DAYS:
        raise ValueError(f"Période invalide : '{period}'. Valeurs acceptées : {list(_PERIOD_DAYS)}")

    etf = get_or_create_etf(ticker, db)
    _ensure_cours(ticker, etf.id, db)

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
    Déclenche un fetch yfinance si les données en BDD sont absentes ou > 24h,
    avec dégradation gracieuse vers les données en cache si Yahoo est indisponible.

    Args:
        ticker: Ticker yfinance (ex: 'CW8.PA').
        date_debut: Date de début (incluse).
        date_fin: Date de fin (incluse).
        db: Session SQLAlchemy.

    Returns:
        DataFrame avec DatetimeIndex et colonnes adj_close, open, high, low, close, volume.
    """
    etf = get_or_create_etf(ticker, db)
    _ensure_cours(ticker, etf.id, db)

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
