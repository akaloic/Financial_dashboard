"""Tests d'intégration de l'API (TestClient + SQLite temporaire).

Particularité : yfinance est simulé EN PANNE. Le but est de prouver que l'application
sert de vraies données depuis le snapshot embarqué même quand Yahoo Finance est
indisponible — exactement le cas d'un hébergement gratuit dont l'IP est bloquée.
"""

import os
import tempfile
from pathlib import Path

import pytest

# Forcer SQLite AVANT d'importer database/main. On pose une chaîne vide (et non un
# pop) pour que load_dotenv(override=False) ne réinjecte pas la DATABASE_URL d'un .env.
os.environ["DATABASE_URL"] = ""
_TMP_DB = Path(tempfile.gettempdir()) / "test_portfolio_api.db"
if _TMP_DB.exists():
    _TMP_DB.unlink()
os.environ["SQLITE_PATH"] = str(_TMP_DB)

import services.etf_fetcher as fetcher  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402

# Simuler Yahoo Finance en panne : tout doit passer par le snapshot embarqué / le cache.
fetcher._fetch_history = lambda ticker: (_ for _ in ()).throw(RuntimeError("Yahoo down (test)"))

_SNAPSHOT = Path(__file__).parent.parent / "data" / "etf_history_seed.csv.gz"
pytestmark = pytest.mark.skipif(
    not _SNAPSHOT.exists(), reason="snapshot absent (lancer scripts/build_seed_snapshot.py)"
)


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:  # le `with` déclenche le lifespan (création tables + seed)
        yield c


def test_health(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["backend"] == "sqlite"


def test_liste_etf_seedee(client):
    r = client.get("/etf/")
    assert r.status_code == 200
    tickers = {e["ticker"] for e in r.json()}
    assert "CW8.PA" in tickers  # seedé depuis le snapshot


def test_fiche_etf(client):
    r = client.get("/etf/CW8.PA")
    assert r.status_code == 200
    assert r.json()["ticker"] == "CW8.PA"


def test_historique_depuis_snapshot_malgre_yahoo_down(client):
    """Yahoo est simulé KO → l'historique doit quand même venir du snapshot."""
    r = client.get("/etf/CW8.PA/historique?period=3y")
    assert r.status_code == 200
    body = r.json()
    assert body["nb_points"] > 100
    assert body["data"][0]["adj_close"] > 0


def test_simulation_dca_avec_metriques(client):
    r = client.post(
        "/simulation/",
        json={
            "etf_ticker": "CW8.PA",
            "capital_initial": 1000,
            "versement_mensuel": 200,
            "date_debut": "2020-01-01",
            "date_fin": "2023-01-01",
            "ter": 0.0012,
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["nb_mois"] >= 30
    assert body["capital_total_investi"] == pytest.approx(1000 + 200 * body["nb_mois"], rel=0.01)
    # Les métriques de risque sont présentes et cohérentes.
    m = body["metriques_risque"]
    assert m["volatilite_annualisee"] >= 0
    assert m["profil_risque"] in {"faible", "modéré", "élevé", "très élevé"}
    assert -1 <= m["max_drawdown"] <= 0


def test_regression_ols(client):
    r = client.post(
        "/regression/",
        json={
            "etf_ticker": "CW8.PA",
            "date_debut": "2020-01-01",
            "date_fin": "2023-01-01",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert "r_squared" in body
    assert "durbin_watson" in body
    assert body["nb_observations"] > 30
