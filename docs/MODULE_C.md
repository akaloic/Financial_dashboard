# docs/MODULE_C.md — Module C : Régression Linéaire OLS

## Objectif

Ajuster un modèle de régression linéaire simple (OLS) sur l'historique de cours d'un ETF, calculer toutes les métriques statistiques requises, projeter le modèle sur 12 mois et fournir une **interprétation critique obligatoire** sur les limites prédictives.

> ⚠️ C'est le module le plus exigeant analytiquement. Il représente **4 des 20 points** du rapport.

---

## Variables du modèle

```
X = numéro du jour de trading depuis le début de la période (entier : 0, 1, 2, ...)
Y = prix de clôture ajusté (adj_close) ce jour-là

Modèle : Y_hat = β0 + β1 × X
```

**Pourquoi utiliser le numéro de jour et non la date ?**
La régression OLS requiert une variable numérique continue. Encoder la date en entier évite les problèmes de saisonnalité et simplifie l'interprétation de β1 (variation de prix par jour de trading).

---

## Calculs à produire

### Coefficients OLS

```python
import numpy as np
from sklearn.linear_model import LinearRegression
import statsmodels.api as sm
from scipy import stats

# Construction des variables
X = np.arange(len(df)).reshape(-1, 1)   # jours de trading
y = df['adj_close'].values

# Via sklearn (coefficients)
model = LinearRegression().fit(X, y)
beta1 = model.coef_[0]      # pente
beta0 = model.intercept_    # intercept
y_pred = model.predict(X)

# Via statsmodels (métriques complètes)
X_sm = sm.add_constant(X)
ols_result = sm.OLS(y, X_sm).fit()
r_squared  = ols_result.rsquared
p_value    = ols_result.pvalues[1]      # p-value de β1
std_error  = ols_result.bse[1]          # erreur standard de β1
residus    = ols_result.resid
```

### R² (coefficient de détermination)
```
R² = 1 - (SS_res / SS_tot)
SS_res = Σ(y_i - ŷ_i)²
SS_tot = Σ(y_i - ȳ)²
```

### Intervalles de confiance à 95 %
```python
from statsmodels.sandbox.regression.predstd import wls_prediction_std

_, ic_low, ic_high = wls_prediction_std(ols_result)
# ic_low et ic_high ont la même longueur que X
```

### Durbin-Watson (bonus +0,5 pt)
```python
from statsmodels.stats.stattools import durbin_watson
dw = durbin_watson(residus)
# Interprétation : ~2 = pas d'autocorrélation, <1 ou >3 = problème sérieux
```

### Projection 12 mois
```python
nb_jours_futurs = 252  # ~12 mois de trading
x_future = np.arange(len(df), len(df) + nb_jours_futurs).reshape(-1, 1)
y_future = model.predict(x_future)
X_future_sm = sm.add_constant(x_future)

# Intervalles de prédiction (pas de confiance) pour les 12 mois futurs
from statsmodels.sandbox.regression.predstd import wls_prediction_std
pred_frame = ols_result.get_prediction(X_future_sm).summary_frame(alpha=0.05)
ic_low_future  = pred_frame['obs_ci_lower'].values
ic_high_future = pred_frame['obs_ci_upper'].values
```

---

## Graphiques attendus

### Graphique 1 — Cours + droite de régression + bande IC 95 %
- Série 1 : cours réel (adj_close) — ligne fine bleue
- Série 2 : droite de régression (ŷ) — ligne rouge
- Série 3 : bande IC 95 % (zone ombrée) — remplissage rouge transparent
- Axe X : dates, Axe Y : prix en €
- Projection future visible à droite du graphique (zone grisée)

### Graphique 2 — Graphique des résidus
- Résidus (y - ŷ) en fonction du jour de trading (X)
- Ligne horizontale à 0
- Si les résidus forment un pattern (courbe, entonnoir) → signal de non-linéarité

---

## Interprétation critique obligatoire

> Cette section est **obligatoire** dans l'interface ET dans le rapport (section la plus discriminante).

### Points à couvrir impérativement :

**1. R² élevé ≠ prédictibilité**
Un R² proche de 1 sur une série temporelle financière reflète souvent une tendance commune (croissance sur la période), pas une vraie relation causale. R² mesure l'ajustement in-sample, pas la capacité prédictive out-of-sample.

**2. Résidus non aléatoires (autocorrélation)**
Sur des séries financières, les résidus sont quasi-systématiquement autocorrélés (Durbin-Watson ≠ 2). Cela viole l'hypothèse d'indépendance des erreurs de l'OLS et rend les p-values et intervalles de confiance invalides.

**3. Spurious Regression (régression fallacieuse)**
Deux séries non-stationnaires (avec tendance) produiront mécaniquement un R² élevé même sans lien réel. C'est le cas de presque tous les cours boursiers en tendance haussière longue. → Mentionner explicitement dans le rapport.

**4. La projection 12 mois est indicative, pas prédictive**
Les marchés financiers ne suivent pas une tendance linéaire déterministe. La projection est une extrapolation d'une tendance passée, non un modèle économique.

**5. Modèles alternatifs (à mentionner)**
Des approches plus adaptées aux séries temporelles : ARIMA, modèles log-linéaires, modèles à variance conditionnelle (GARCH).

### Texte d'avertissement à afficher dans l'interface
```
⚠️ Avertissement : Ce modèle de régression linéaire est fourni à titre pédagogique.
Un R² élevé sur une série temporelle financière reflète une tendance commune, non une 
capacité prédictive réelle. Les résidus sont autocorrélés, ce qui invalide les hypothèses 
classiques de l'OLS. Ne pas utiliser cette projection pour des décisions d'investissement.
```

---

## Format des résultats à retourner (JSON)

```json
{
  "etf_ticker": "CW8.PA",
  "periode_debut": "2015-01-02",
  "periode_fin": "2024-12-31",
  "beta0": 45.23,
  "beta1": 0.142,
  "r_squared": 0.968,
  "p_value": 1.2e-312,
  "std_error": 0.0018,
  "durbin_watson": 0.043,
  "nb_observations": 2517,
  "donnees_historiques": [
    {"date": "2015-01-02", "adj_close": 48.10, "y_pred": 45.37, "residue": 2.73}
  ],
  "projection": [
    {"date": "2025-01-02", "y_pred": 402.15, "ic_low": 310.50, "ic_high": 493.80}
  ]
}
```

---

## Implémentation complète (backend/services/regression_engine.py)

```python
import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.stats.stattools import durbin_watson
from sklearn.linear_model import LinearRegression
from typing import Dict, Any

def run_ols_regression(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Exécute la régression OLS sur l'historique de cours.
    df doit avoir un DatetimeIndex et une colonne 'adj_close'.
    Retourne un dict avec tous les métriques et données de projection.
    """
    df = df[['adj_close']].dropna().sort_index()
    n = len(df)

    X = np.arange(n).reshape(-1, 1)
    y = df['adj_close'].values

    # Coefficients
    skl_model = LinearRegression().fit(X, y)
    beta0 = float(skl_model.intercept_)
    beta1 = float(skl_model.coef_[0])

    # Métriques statsmodels
    X_sm = sm.add_constant(X)
    ols = sm.OLS(y, X_sm).fit()
    r2       = float(ols.rsquared)
    p_val    = float(ols.pvalues[1])
    std_err  = float(ols.bse[1])
    residus  = ols.resid
    dw       = float(durbin_watson(residus))

    # Bande IC 95 % in-sample
    pred_in = ols.get_prediction(X_sm).summary_frame(alpha=0.05)

    # Projection 12 mois (252 jours de trading)
    x_fut = np.arange(n, n + 252).reshape(-1, 1)
    X_fut_sm = sm.add_constant(x_fut)
    pred_out = ols.get_prediction(X_fut_sm).summary_frame(alpha=0.05)

    future_dates = pd.bdate_range(df.index[-1], periods=253)[1:]  # 252 jours ouvrés futurs

    projection = [
        {
            "date": d.date().isoformat(),
            "y_pred": round(float(pred_out['mean'].iloc[i]), 4),
            "ic_low": round(float(pred_out['obs_ci_lower'].iloc[i]), 4),
            "ic_high": round(float(pred_out['obs_ci_upper'].iloc[i]), 4),
        }
        for i, d in enumerate(future_dates)
    ]

    historique = [
        {
            "date": df.index[i].date().isoformat(),
            "adj_close": round(float(y[i]), 4),
            "y_pred": round(float(pred_in['mean'].iloc[i]), 4),
            "residue": round(float(residus[i]), 4),
        }
        for i in range(n)
    ]

    return {
        "beta0": round(beta0, 6),
        "beta1": round(beta1, 6),
        "r_squared": round(r2, 6),
        "p_value": p_val,
        "std_error": round(std_err, 6),
        "durbin_watson": round(dw, 4),
        "nb_observations": n,
        "donnees_historiques": historique,
        "projection": projection,
    }
```

---

## Critères d'évaluation liés à ce module

- **Rapport — analyse régression (4 pts)** : métriques calculées, interprétation critique, limites évoquées.
- **Bonus Durbin-Watson (+0,5 pt)** : calcul et interprétation du DW.
- **Application fonctionnelle (6 pts)** : graphiques corrects, projection affichée.

## Erreurs fréquentes à éviter

- Présenter R² comme mesure de "fiabilité de la prédiction" → faux, l'expliquer clairement.
- Oublier de mentionner la spurious regression dans le rapport → perte de points assurée.
- Utiliser les intervalles de **confiance** à la place des intervalles de **prédiction** pour la projection → les IC de prédiction sont plus larges et plus corrects pour des valeurs individuelles futures.
- Ne pas afficher l'avertissement dans l'interface → attendu par l'encadrant.
- Confondre p-value du modèle global et p-value de β1.
