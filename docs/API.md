# API — Documentation des endpoints REST

## Base URL

- Développement : `http://localhost:8000`
- Production : `https://<votre-app>.railway.app` (ou Render)
- Documentation interactive Swagger : `{BASE_URL}/docs`

## Conventions

Toutes les réponses sont en JSON. Les dates sont au format ISO 8601 (`YYYY-MM-DD`).
Les tickers incluent l'extension de place : `CW8.PA`, `ESE.PA`. Les codes HTTP
utilisés sont les standards (`200`, `201`, `400`, `404`, `422`, `500`). Les
erreurs renvoient `{"detail": "message d'erreur"}`.

---

## Module A — ETF

### `GET /etf/`

Liste les ETF disponibles en BDD, avec recherche optionnelle par texte.

Query parameters :

| Paramètre | Type | Requis | Description |
|---|---|---|---|
| `search` | string | Non | Filtre par ticker ou nom (recherche partielle, insensible à la casse) |
| `limit` | int | Non | Nombre max de résultats (défaut : 50) |

Réponse 200 :
```json
[
  {
    "id": 1,
    "ticker": "CW8.PA",
    "nom": "Amundi MSCI World",
    "indice": "MSCI World",
    "gestionnaire": "Amundi",
    "ter": 0.0012,
    "eligible_pea": true,
    "devise": "EUR"
  }
]
```

### `GET /etf/{ticker}`

Fiche descriptive complète d'un ETF.

Path parameter : `ticker` (string), ex. `CW8.PA`.

Réponse 200 :
```json
{
  "id": 1,
  "ticker": "CW8.PA",
  "nom": "Amundi MSCI World",
  "indice": "MSCI World",
  "gestionnaire": "Amundi",
  "ter": 0.0012,
  "eligible_pea": true,
  "devise": "EUR",
  "derniere_date_cours": "2024-12-31"
}
```

Réponse 404 :
```json
{"detail": "ETF 'XYZ.PA' non trouvé"}
```

### `GET /etf/{ticker}/historique`

Historique de cours d'un ETF. Déclenche un fetch yfinance si les données ne
sont pas en BDD ou datent de plus de 24h.

Path parameter : `ticker` (string).

Query parameters :

| Paramètre | Type | Requis | Valeurs | Défaut |
|---|---|---|---|---|
| `period` | string | Non | `1y`, `3y`, `10y` | `1y` |

Réponse 200 :
```json
{
  "ticker": "CW8.PA",
  "period": "1y",
  "nb_points": 252,
  "data": [
    {"date": "2024-01-02", "open": 391.2, "high": 393.5, "low": 390.1, "close": 392.8, "adj_close": 392.8, "volume": 123456}
  ]
}
```

---

## Module B — Simulation DCA

### `POST /simulation/`

Lance une simulation DCA et persiste les résultats.

Body :
```json
{
  "etf_ticker": "CW8.PA",
  "capital_initial": 1000.0,
  "versement_mensuel": 200.0,
  "date_debut": "2015-01-01",
  "date_fin": "2024-12-31",
  "ter": 0.0012
}
```

Contraintes :
- `capital_initial` ≥ 0
- `versement_mensuel` > 0
- `date_debut` < `date_fin`
- `ter` ∈ [0, 0.05]

Réponse 201 :
```json
{
  "simulation_id": 42,
  "etf_ticker": "CW8.PA",
  "nb_mois": 120,
  "capital_total_investi": 25000.0,
  "valeur_finale_brute": 48320.50,
  "valeur_finale_nette": 47210.30,
  "gain_net_euros": 22210.30,
  "gain_net_pct": 88.84,
  "cagr_brut": 0.0842,
  "cagr_net": 0.0815,
  "valeur_livret_a": 29850.20,
  "resultats_mensuels": [
    {
      "mois": 1,
      "date": "2015-01-02",
      "prix_cloture": 152.34,
      "parts_achetees": 7.876,
      "parts_cumulees": 7.876,
      "valeur_brute": 1200.00,
      "valeur_nette": 1199.90,
      "capital_investi": 1200.00
    }
  ]
}
```

### `GET /simulation/{id}`

Retourne les résultats d'une simulation existante sans relancer le calcul.
Même format de réponse que `POST /simulation/`. Renvoie 404 si l'id n'existe pas.

---

## Module C — Régression OLS

### `POST /regression/`

Calcule la régression OLS sur un ETF pour une période donnée.

Body :
```json
{
  "etf_ticker": "CW8.PA",
  "date_debut": "2015-01-01",
  "date_fin": "2024-12-31"
}
```

Réponse 201 :
```json
{
  "regression_id": 7,
  "etf_ticker": "CW8.PA",
  "periode_debut": "2015-01-02",
  "periode_fin": "2024-12-31",
  "beta0": 45.23,
  "beta1": 0.1423,
  "r_squared": 0.9681,
  "p_value": 1.2e-312,
  "std_error": 0.0018,
  "durbin_watson": 0.043,
  "nb_observations": 2517,
  "interpretation": {
    "avertissement": "R² élevé ne signifie pas prédictibilité. Résidus autocorrélés (DW=0.043). Risque de régression fallacieuse.",
    "tendance_journaliere_euros": 0.1423,
    "projection_12m_disclaimer": "Projection indicative uniquement. Ne pas utiliser pour des décisions d'investissement."
  },
  "donnees_historiques": [...],
  "projection": [...]
}
```

### `GET /regression/{etf_id}`

Retourne la dernière régression calculée pour un ETF (par id BDD).
Renvoie 404 s'il n'en existe pas.

---

## Codes d'erreur courants

| Code | Scénario |
|---|---|
| 400 | Paramètres invalides (date_fin < date_debut, TER hors plage) |
| 404 | Ticker inconnu, simulation ou régression inexistante |
| 422 | Corps JSON mal formé (Pydantic validation error) |
| 500 | Erreur yfinance (service indisponible, ticker inexistant) |

---

## Exemple d'implémentation FastAPI

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from services.etf_fetcher import get_or_fetch_etf, get_historique

router = APIRouter(prefix="/etf", tags=["ETF"])

@router.get("/", summary="Liste des ETF disponibles")
def list_etf(search: str = Query(None), limit: int = Query(50), db: Session = Depends(get_db)):
    """
    Retourne la liste des ETF en BDD.
    - search : filtre optionnel sur ticker ou nom
    - limit : nombre maximum de résultats (défaut 50)
    """
    # logique de requête SQLAlchemy
    pass

@router.get("/{ticker}", summary="Fiche descriptive d'un ETF")
def get_etf(ticker: str, db: Session = Depends(get_db)):
    """Retourne la fiche complète d'un ETF par ticker. 404 si inconnu."""
    etf = db.query(ETF).filter(ETF.ticker == ticker.upper()).first()
    if not etf:
        raise HTTPException(status_code=404, detail=f"ETF '{ticker}' non trouvé")
    return etf
```