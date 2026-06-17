"""Métriques de risque (pures, testables sans réseau ni base).

Calculées sur la série de prix mensuels de l'ETF (le profil de risque de l'actif),
et non sur la valeur du portefeuille DCA — cette dernière est « polluée » par les
versements successifs, ce qui fausserait volatilité et drawdown.

Convention : taux sans risque = Livret A (3 %/an), cohérent avec le reste de l'app.
"""

import math
from typing import Any, Dict, List

LIVRET_A_TAUX_ANNUEL = 0.03


def _empty(reason: str) -> Dict[str, Any]:
    return {
        "volatilite_annualisee": 0.0,
        "sharpe": 0.0,
        "sortino": 0.0,
        "max_drawdown": 0.0,
        "meilleur_mois": 0.0,
        "pire_mois": 0.0,
        "profil_risque": "indéterminé",
        "note": reason,
    }


def _profil(vol_annuelle: float) -> str:
    """Classe le profil de risque selon la volatilité annualisée (heuristique pédagogique)."""
    if vol_annuelle < 0.10:
        return "faible"
    if vol_annuelle < 0.18:
        return "modéré"
    if vol_annuelle < 0.28:
        return "élevé"
    return "très élevé"


def compute_risk_metrics(
    monthly_prices: List[float], risk_free_annual: float = LIVRET_A_TAUX_ANNUEL
) -> Dict[str, Any]:
    """Calcule les métriques de risque ajusté à partir d'une série de prix mensuels.

    Args:
        monthly_prices: prix de clôture mensuels (ordre chronologique).
        risk_free_annual: taux sans risque annuel (défaut : Livret A 3 %).

    Returns:
        Dict : volatilite_annualisee, sharpe, sortino, max_drawdown,
        meilleur_mois, pire_mois (tous en décimal), profil_risque (label).
    """
    prices = [float(p) for p in monthly_prices if p and p > 0]
    n = len(prices)
    if n < 3:
        return _empty("Série trop courte pour des métriques de risque fiables (< 3 mois).")

    returns = [prices[i] / prices[i - 1] - 1 for i in range(1, n)]
    k = len(returns)

    mean_m = sum(returns) / k
    var_m = sum((r - mean_m) ** 2 for r in returns) / (k - 1) if k > 1 else 0.0
    std_m = math.sqrt(var_m)
    vol_annual = std_m * math.sqrt(12)

    rf_m = risk_free_annual / 12.0
    excess = [r - rf_m for r in returns]
    mean_excess = sum(excess) / k
    sharpe = (mean_excess / std_m) * math.sqrt(12) if std_m > 0 else 0.0

    downside = [min(0.0, e) for e in excess]
    dd_var = sum(d * d for d in downside) / k
    dd_std = math.sqrt(dd_var)
    sortino = (mean_excess / dd_std) * math.sqrt(12) if dd_std > 0 else 0.0

    peak = prices[0]
    max_dd = 0.0
    for p in prices:
        peak = max(peak, p)
        max_dd = min(max_dd, p / peak - 1)

    return {
        "volatilite_annualisee": round(vol_annual, 4),
        "sharpe": round(sharpe, 3),
        "sortino": round(sortino, 3),
        "max_drawdown": round(max_dd, 4),
        "meilleur_mois": round(max(returns), 4),
        "pire_mois": round(min(returns), 4),
        "profil_risque": _profil(vol_annual),
        "note": (
            "Métriques annualisées sur la série de prix mensuels de l'ETF. "
            "Sharpe/Sortino calculés vs Livret A (3 %/an)."
        ),
    }
