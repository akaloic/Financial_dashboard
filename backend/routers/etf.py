from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models.etf import ETF
from schemas.etf import ETFResponse, HistoriquePoint, HistoriqueResponse
from services.etf_fetcher import get_derniere_date_cours, get_historique, get_or_create_etf

router = APIRouter()


@router.get("/", response_model=list[ETFResponse], summary="Liste des ETF disponibles")
def list_etf(
    search: str = Query(None, description="Filtre partiel sur ticker ou nom (insensible à la casse)"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Retourne la liste des ETF enregistrés en base de données.

    - **search**: filtre optionnel sur le ticker ou le nom (partiel, insensible à la casse).
    - **limit**: nombre maximum de résultats retournés (défaut 50).

    Returns:
        Liste d'objets ETF avec métadonnées.
    """
    query = db.query(ETF)
    if search:
        pattern = f"%{search.upper()}%"
        query = query.filter(
            ETF.ticker.ilike(pattern) | ETF.nom.ilike(f"%{search}%")
        )
    etfs = query.limit(limit).all()

    result = []
    for etf in etfs:
        derniere_date = get_derniere_date_cours(etf.id, db)
        data = ETFResponse.model_validate(etf)
        data.derniere_date_cours = derniere_date
        result.append(data)
    return result


@router.get("/{ticker}/historique", response_model=HistoriqueResponse, summary="Historique de cours d'un ETF")
def get_historique_endpoint(
    ticker: str,
    period: str = Query("1y", pattern="^(1y|3y|10y)$", description="Période : 1y, 3y ou 10y"),
    db: Session = Depends(get_db),
):
    """
    Retourne l'historique de cours d'un ETF identifié par son ticker.
    Déclenche un fetch yfinance si les données sont absentes ou datent de plus de 24h.

    - **ticker**: code boursier (ex: CW8.PA).
    - **period**: fenêtre temporelle — '1y', '3y' ou '10y' (défaut: '1y').

    Returns:
        Objet avec ticker, period, nb_points et la liste des points de cours (OHLCV + adj_close).
    """
    try:
        df = get_historique(ticker.upper(), period, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des cours : {e}")

    if df.empty:
        raise HTTPException(status_code=404, detail=f"Aucun cours disponible pour '{ticker}' sur la période '{period}'")

    data = [
        HistoriquePoint(
            date=idx.date(),
            open=row.get("open"),
            high=row.get("high"),
            low=row.get("low"),
            close=row["close"],
            adj_close=row.get("adj_close"),
            volume=int(row["volume"]) if row.get("volume") is not None else None,
        )
        for idx, row in df.iterrows()
    ]
    return HistoriqueResponse(ticker=ticker.upper(), period=period, nb_points=len(data), data=data)


@router.get("/{ticker}", response_model=ETFResponse, summary="Fiche descriptive d'un ETF")
def get_etf(ticker: str, db: Session = Depends(get_db)):
    """
    Retourne la fiche descriptive complète d'un ETF identifié par son ticker.

    - **ticker**: code boursier (ex: CW8.PA).

    Returns:
        Objet ETF avec toutes les métadonnées et la date de dernière mise à jour des cours.

    Raises:
        404 si le ticker est inconnu en base de données.
    """
    etf = db.query(ETF).filter(ETF.ticker == ticker.upper()).first()
    if not etf:
        raise HTTPException(status_code=404, detail=f"ETF '{ticker}' non trouvé")

    derniere_date = get_derniere_date_cours(etf.id, db)
    response = ETFResponse.model_validate(etf)
    response.derniere_date_cours = derniere_date
    return response
