from typing import Any, Dict

import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.linear_model import LinearRegression
from statsmodels.stats.stattools import durbin_watson

_AVERTISSEMENT = (
    "⚠️ Avertissement : Ce modèle de régression linéaire est fourni à titre pédagogique. "
    "Un R² élevé sur une série temporelle financière reflète une tendance commune, non une "
    "capacité prédictive réelle. Les résidus sont autocorrélés, ce qui invalide les hypothèses "
    "classiques de l'OLS. Ne pas utiliser cette projection pour des décisions d'investissement."
)

_PROJECTION_DISCLAIMER = (
    "Projection indicative uniquement basée sur la tendance historique linéaire. "
    "Ne pas utiliser pour des décisions d'investissement."
)


def run_ols_regression(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Exécute la régression OLS sur l'historique de cours d'un ETF.

    Args:
        df: DataFrame avec DatetimeIndex et colonne 'adj_close'. Doit contenir >= 30 observations.

    Returns:
        Dict contenant coefficients, métriques statistiques, données historiques et projection 12 mois.

    Raises:
        ValueError: Si le DataFrame a moins de 30 observations.
    """
    df = df[["adj_close"]].dropna().sort_index()
    n = len(df)

    if n < 30:
        raise ValueError(f"Pas assez de données pour la régression OLS : {n} observations (minimum 30).")

    X = np.arange(n).reshape(-1, 1)
    y = df["adj_close"].values

    skl_model = LinearRegression().fit(X, y)
    beta0 = float(skl_model.intercept_)
    beta1 = float(skl_model.coef_[0])

    X_sm = sm.add_constant(X)
    ols = sm.OLS(y, X_sm).fit()
    r_squared = float(ols.rsquared)
    p_value = float(ols.pvalues[1])
    std_error = float(ols.bse[1])
    residus = ols.resid
    dw = float(durbin_watson(residus))

    pred_in = ols.get_prediction(X_sm).summary_frame(alpha=0.05)

    x_fut = np.arange(n, n + 252).reshape(-1, 1)
    X_fut_sm = sm.add_constant(x_fut)
    pred_out = ols.get_prediction(X_fut_sm).summary_frame(alpha=0.05)
    future_dates = pd.bdate_range(df.index[-1], periods=253)[1:]

    historique = [
        {
            "date": df.index[i].date(),
            "adj_close": round(float(y[i]), 4),
            "y_pred": round(float(pred_in["mean"].iloc[i]), 4),
            "ic_low": round(float(pred_in["obs_ci_lower"].iloc[i]), 4),
            "ic_high": round(float(pred_in["obs_ci_upper"].iloc[i]), 4),
            "residue": round(float(residus[i]), 4),
        }
        for i in range(n)
    ]

    projection = [
        {
            "date": future_dates[i].date(),
            "y_pred": round(float(pred_out["mean"].iloc[i]), 4),
            "ic_low": round(float(pred_out["obs_ci_lower"].iloc[i]), 4),
            "ic_high": round(float(pred_out["obs_ci_upper"].iloc[i]), 4),
        }
        for i in range(len(future_dates))
    ]

    return {
        "beta0": round(beta0, 6),
        "beta1": round(beta1, 6),
        "r_squared": round(r_squared, 6),
        "p_value": p_value,
        "std_error": round(std_error, 6),
        "durbin_watson": round(dw, 4),
        "nb_observations": n,
        "interpretation": {
            "avertissement": _AVERTISSEMENT,
            "tendance_journaliere_euros": round(beta1, 4),
            "projection_12m_disclaimer": _PROJECTION_DISCLAIMER,
        },
        "donnees_historiques": historique,
        "projection": projection,
    }
