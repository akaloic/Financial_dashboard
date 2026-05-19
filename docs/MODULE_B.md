# Module B — Simulateur DCA (Backtesting)

Simuler une stratégie d'investissement passif en DCA (Dollar-Cost Averaging)
sur un ETF, avec déduction mensuelle du TER, métriques de performance et
comparaison avec le Livret A.

## Paramètres d'entrée

| Paramètre | Type | Exemple | Contraintes |
|---|---|---|---|
| `etf_ticker` | string | `"CW8.PA"` | ETF présent en BDD |
| `capital_initial` | float | 1000.0 | ≥ 0 |
| `versement_mensuel` | float | 200.0 | > 0 |
| `date_debut` | date | `"2015-01-01"` | Doit avoir des cours disponibles |
| `date_fin` | date | `"2024-12-31"` | > date_debut |
| `ter` | float | 0.0012 | ≥ 0, < 1 (valeur décimale, ex 0.12 % = 0.0012) |

## Algorithme

```
POUR chaque mois dans [date_debut, date_fin] :

  1. Récupérer le prix de clôture ajusté du 1er jour de trading du mois
     prix = adj_close du premier jour ouvré du mois

  2. Calculer les parts achetées ce mois :
     Si mois == 1 ET capital_initial > 0 :
         parts_achetees = (capital_initial + versement_mensuel) / prix
     Sinon :
         parts_achetees = versement_mensuel / prix

  3. Cumuler les parts :
     parts_cumulees += parts_achetees

  4. Calculer la valeur brute (avant TER) :
     valeur_brute = parts_cumulees * prix

  5. Appliquer le TER mensuel :
     valeur_nette = valeur_brute * (1 - TER / 12)
     parts_cumulees = valeur_nette / prix    (ajustement des parts)

  6. Mettre à jour le capital investi :
     capital_investi += versement_mensuel (+ capital_initial au mois 1)

  7. Stocker la ligne en BDD (resultat_simulation)

FIN POUR
```

### Formules

TER mensuel :
```
valeur_nette(n) = valeur_brute(n) × (1 - TER / 12)
```

CAGR (Compound Annual Growth Rate) :
```
CAGR = (valeur_finale / capital_total_verse) ^ (1 / nb_annees) - 1
```
avec `nb_annees = (date_fin - date_debut).days / 365.25`.

Livret A (référence sans risque) :
- Taux fixe actuel : 3 % annuel, soit `0.03 / 12` mensuel
- Calcul : `valeur_livret(n) = valeur_livret(n-1) × (1 + 0.03/12) + versement_mensuel`

## Implémentation Python

`backend/services/dca_engine.py` :

```python
import pandas as pd
from datetime import date
from typing import List, Dict, Any

def run_dca_simulation(
    prix_df: pd.DataFrame,   # colonnes: date (index), adj_close
    capital_initial: float,
    versement_mensuel: float,
    date_debut: date,
    date_fin: date,
    ter: float
) -> List[Dict[str, Any]]:
    """
    Exécute le backtesting DCA mois par mois.
    Retourne une liste de dict (un par mois simulé).
    """
    mask = (prix_df.index >= pd.Timestamp(date_debut)) & (prix_df.index <= pd.Timestamp(date_fin))
    df = prix_df[mask].copy()

    df['ym'] = df.index.to_period('M')
    monthly = df.groupby('ym').first()

    results = []
    parts_cumulees = 0.0
    capital_investi = 0.0

    for i, (period, row) in enumerate(monthly.iterrows()):
        prix = row['adj_close']
        if prix <= 0:
            continue

        apport = versement_mensuel + (capital_initial if i == 0 else 0)
        parts_achetees = apport / prix
        parts_cumulees += parts_achetees
        capital_investi += apport

        valeur_brute = parts_cumulees * prix
        valeur_nette = valeur_brute * (1 - ter / 12)
        parts_cumulees = valeur_nette / prix

        results.append({
            "mois": i + 1,
            "date": period.to_timestamp().date().isoformat(),
            "prix_cloture": round(prix, 4),
            "parts_achetees": round(parts_achetees, 6),
            "parts_cumulees": round(parts_cumulees, 6),
            "valeur_brute": round(valeur_brute, 2),
            "valeur_nette": round(valeur_nette, 2),
            "capital_investi": round(capital_investi, 2),
        })

    return results


def compute_cagr(valeur_finale: float, capital_total: float, nb_annees: float) -> float:
    """Calcule le CAGR. Retourne 0 si paramètres invalides."""
    if capital_total <= 0 or nb_annees <= 0 or valeur_finale <= 0:
        return 0.0
    return (valeur_finale / capital_total) ** (1 / nb_annees) - 1
```

## Tests pytest

`backend/tests/test_dca.py` — minimum 3 tests, voir critères d'évaluation.

```python
import pytest
import pandas as pd
from datetime import date
from services.dca_engine import run_dca_simulation, compute_cagr

@pytest.fixture
def prix_constants():
    """Cours fictifs constants à 100 € sur 252 jours ouvrés."""
    idx = pd.date_range("2020-01-02", periods=252, freq="B")
    return pd.DataFrame({"adj_close": [100.0] * 252}, index=idx)

def test_capital_zero(prix_constants):
    """Capital initial = 0 : premier mois = versement seul."""
    res = run_dca_simulation(prix_constants, 0, 100, date(2020,1,1), date(2020,12,31), 0.0)
    assert res[0]["capital_investi"] == 100.0
    assert res[0]["parts_achetees"] == pytest.approx(1.0)

def test_ter_zero(prix_constants):
    """TER = 0 : valeur_nette == valeur_brute."""
    res = run_dca_simulation(prix_constants, 0, 100, date(2020,1,1), date(2020,12,31), 0.0)
    for r in res:
        assert r["valeur_nette"] == pytest.approx(r["valeur_brute"], rel=1e-6)

def test_periode_un_mois(prix_constants):
    """Période = 1 mois : exactement 1 résultat retourné."""
    res = run_dca_simulation(prix_constants, 500, 100, date(2020,1,1), date(2020,1,31), 0.001)
    assert len(res) == 1
    assert res[0]["capital_investi"] == 600.0

def test_cagr_coherent():
    """CAGR de 0 % si valeur finale == capital investi."""
    assert compute_cagr(1000.0, 1000.0, 5.0) == pytest.approx(0.0, abs=1e-6)

def test_cagr_invalide():
    """CAGR retourne 0 pour paramètres invalides."""
    assert compute_cagr(0, 1000, 5) == 0.0
    assert compute_cagr(1000, 0, 5) == 0.0
```

## Affichage frontend

1. Courbe portefeuille : `valeur_nette` (avec TER), `valeur_brute` (sans TER) et Livret A — même graphique, 3 séries
2. Tableau récapitulatif par mois ou par an : date, capital investi, valeur nette, gain/perte en €
3. Métriques synthèse : capital total investi, valeur finale (avec et sans frais), gain net en € et en %, CAGR (avec et sans TER), durée de la simulation

## Critères d'évaluation liés à ce module

- Application fonctionnelle (6 pts) : simulation correcte avec vraies données, TER appliqué
- Qualité technique (3 pts) : tests pytest couvrant les cas limites

## Points d'attention

Le TER s'applique sur la **valeur du portefeuille**, pas sur le capital investi.
C'est l'erreur classique qui sous-estime ou surestime massivement l'impact des frais.

Toujours prendre le prix du **premier jour ouvré du mois**, pas le 1er du mois
calendaire (qui peut tomber un week-end).

Le `capital_initial` doit être inclus dans le premier versement, sinon il n'apparaît
nulle part dans la simulation.

TER mensuel = TER annuel / 12. Confusion fréquente, vérifier les ordres de grandeur
sur 10 ans avec et sans frais (la différence doit être significative).

Le backtesting n'est pas une prédiction. Le préciser explicitement dans l'interface :
les performances passées ne garantissent rien pour le futur.