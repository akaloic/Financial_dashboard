import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.etf import ETF
from models.regression import ResultatRegression
from schemas.regression import (
    HistoriqueRegressionPoint,
    Interpretation,
    ProjectionPoint,
    RegressionRequest,
    RegressionResponse,
)
from services.etf_fetcher import get_historique_by_dates, get_or_create_etf
from services.regression_engine import run_ols_regression

router = APIRouter()


def _build_response(reg: ResultatRegression, etf_ticker: str) -> RegressionResponse:
    stored = json.loads(reg.projection_json or "{}")
    return RegressionResponse(
        regression_id=reg.id,
        etf_ticker=etf_ticker,
        periode_debut=reg.periode_debut,
        periode_fin=reg.periode_fin,
        beta0=reg.beta0,
        beta1=reg.beta1,
        r_squared=reg.r_squared,
        p_value=reg.p_value,
        std_error=reg.std_error,
        durbin_watson=reg.durbin_watson,
        nb_observations=reg.nb_observations,
        interpretation=Interpretation(**stored["interpretation"]),
        donnees_historiques=[HistoriqueRegressionPoint(**p) for p in stored["donnees_historiques"]],
        projection=[ProjectionPoint(**p) for p in stored["projection"]],
    )


@router.post("/", response_model=RegressionResponse, status_code=status.HTTP_201_CREATED, summary="Calculer la régression OLS")
def create_regression(req: RegressionRequest, db: Session = Depends(get_db)):
    """
    Calcule une régression linéaire OLS sur l'historique d'un ETF et persiste les résultats.

    Body:
        - **etf_ticker**: ticker yfinance (ex: 'CW8.PA').
        - **date_debut**: début de la période d'analyse (format YYYY-MM-DD).
        - **date_fin**: fin de la période d'analyse (format YYYY-MM-DD).

    Returns:
        Coefficients OLS (β0, β1), métriques statistiques (R², p-value, Durbin-Watson),
        données historiques avec résidus et projection 12 mois avec intervalles de prédiction à 95 %.

    Raises:
        400 si la période ne contient pas assez de données (minimum 30 observations).
        500 en cas d'erreur yfinance.
    """
    if req.date_debut >= req.date_fin:
        raise HTTPException(status_code=400, detail="date_debut doit être antérieure à date_fin")

    try:
        etf = get_or_create_etf(req.etf_ticker, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        df = get_historique_by_dates(req.etf_ticker, req.date_debut, req.date_fin, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Impossible de récupérer les cours : {e}")

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail=f"Aucun cours disponible pour '{req.etf_ticker}' sur la période demandée."
        )

    try:
        result = run_ols_regression(df)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    periode_debut = df.index[0].date()
    periode_fin = df.index[-1].date()

    stored_json = json.dumps({
        "interpretation": result["interpretation"],
        "donnees_historiques": [
            {**p, "date": p["date"].isoformat() if hasattr(p["date"], "isoformat") else p["date"]}
            for p in result["donnees_historiques"]
        ],
        "projection": [
            {**p, "date": p["date"].isoformat() if hasattr(p["date"], "isoformat") else p["date"]}
            for p in result["projection"]
        ],
    })

    reg = ResultatRegression(
        etf_id=etf.id,
        periode_debut=periode_debut,
        periode_fin=periode_fin,
        beta0=result["beta0"],
        beta1=result["beta1"],
        r_squared=result["r_squared"],
        p_value=result["p_value"],
        std_error=result["std_error"],
        durbin_watson=result["durbin_watson"],
        nb_observations=result["nb_observations"],
        projection_json=stored_json,
    )
    db.add(reg)
    db.commit()
    db.refresh(reg)

    return RegressionResponse(
        regression_id=reg.id,
        etf_ticker=etf.ticker,
        periode_debut=periode_debut,
        periode_fin=periode_fin,
        beta0=result["beta0"],
        beta1=result["beta1"],
        r_squared=result["r_squared"],
        p_value=result["p_value"],
        std_error=result["std_error"],
        durbin_watson=result["durbin_watson"],
        nb_observations=result["nb_observations"],
        interpretation=Interpretation(**result["interpretation"]),
        donnees_historiques=[HistoriqueRegressionPoint(**p) for p in result["donnees_historiques"]],
        projection=[ProjectionPoint(**p) for p in result["projection"]],
    )


@router.get("/{etf_id}", response_model=RegressionResponse, summary="Dernière régression calculée pour un ETF")
def get_regression(etf_id: int, db: Session = Depends(get_db)):
    """
    Récupère la dernière régression OLS calculée pour un ETF donné.

    - **etf_id**: identifiant BDD de l'ETF (visible via GET /etf/).

    Returns:
        Résultats de la régression la plus récente sans relancer le calcul.

    Raises:
        404 si aucune régression n'existe pour cet ETF.
    """
    reg = (
        db.query(ResultatRegression)
        .filter(ResultatRegression.etf_id == etf_id)
        .order_by(ResultatRegression.date_calcul.desc())
        .first()
    )
    if not reg:
        raise HTTPException(status_code=404, detail=f"Aucune régression trouvée pour l'ETF #{etf_id}")

    etf = db.query(ETF).filter(ETF.id == etf_id).first()
    return _build_response(reg, etf.ticker if etf else "")
