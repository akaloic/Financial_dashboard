import math

import pytest

from services.metrics import compute_risk_metrics


def test_prix_constants_volatilite_nulle():
    """Prix constants → volatilité, Sharpe, drawdown nuls."""
    m = compute_risk_metrics([100.0] * 24)
    assert m["volatilite_annualisee"] == 0.0
    assert m["sharpe"] == 0.0
    assert m["max_drawdown"] == 0.0
    assert m["profil_risque"] == "faible"


def test_serie_trop_courte():
    """Moins de 3 points → métriques neutres avec note explicative."""
    m = compute_risk_metrics([100.0, 110.0])
    assert m["profil_risque"] == "indéterminé"
    assert "courte" in m["note"].lower()


def test_max_drawdown_connu():
    """Drawdown = plus forte baisse pic→creux : 100→50 = -50 %."""
    m = compute_risk_metrics([100.0, 120.0, 60.0, 80.0, 120.0])
    # pic à 120, creux à 60 → drawdown = 60/120 - 1 = -0.5
    assert m["max_drawdown"] == pytest.approx(-0.5, abs=1e-9)


def test_hausse_reguliere_sharpe_positif():
    """Série haussière régulière → Sharpe positif, drawdown nul."""
    prices = [100.0 * (1.02**i) for i in range(24)]
    m = compute_risk_metrics(prices)
    assert m["sharpe"] > 0
    assert m["max_drawdown"] == 0.0
    assert m["meilleur_mois"] == pytest.approx(0.02, abs=1e-6)


def test_volatilite_annualisee_coherente():
    """La volatilité annualisée = écart-type mensuel × sqrt(12)."""
    prices = [100, 110, 99, 121, 105, 130, 118, 140]
    m = compute_risk_metrics(prices)
    rets = [prices[i] / prices[i - 1] - 1 for i in range(1, len(prices))]
    mean = sum(rets) / len(rets)
    var = sum((r - mean) ** 2 for r in rets) / (len(rets) - 1)
    expected = math.sqrt(var) * math.sqrt(12)
    assert m["volatilite_annualisee"] == pytest.approx(round(expected, 4), abs=1e-4)
