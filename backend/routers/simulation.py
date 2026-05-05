import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.etf import ETF
from models.simulation import ResultatSimulation, Simulation
from schemas.simulation import ResultatMensuel, SimulationRequest, SimulationResponse
from services.dca_engine import compute_cagr, compute_livret_a, run_dca_simulation
from services.etf_fetcher import get_historique_by_dates, get_or_create_etf

router = APIRouter()


def _build_response(simulation: Simulation, resultats: list, etf_ticker: str) -> SimulationResponse:
    mensuels = [
        ResultatMensuel(
            mois=r.mois,
            date=r.date,
            prix_cloture=r.prix_cloture,
            parts_achetees=r.parts_achetees,
            parts_cumulees=r.parts_cumulees,
            valeur_brute=r.valeur_brute,
            valeur_nette=r.valeur_nette,
            capital_investi=r.capital_investi,
        )
        for r in resultats
    ]

    if not mensuels:
        raise HTTPException(status_code=400, detail="La simulation n'a produit aucun résultat mensuel.")

    dernier = mensuels[-1]
    capital_total = dernier.capital_investi
    valeur_finale_brute = dernier.valeur_brute
    valeur_finale_nette = dernier.valeur_nette
    gain_net_euros = round(valeur_finale_nette - capital_total, 2)
    gain_net_pct = round((gain_net_euros / capital_total) * 100, 2) if capital_total > 0 else 0.0

    nb_annees = (simulation.date_fin - simulation.date_debut).days / 365.25
    cagr_brut = round(compute_cagr(valeur_finale_brute, capital_total, nb_annees), 6)
    cagr_net = round(compute_cagr(valeur_finale_nette, capital_total, nb_annees), 6)
    valeur_livret_a = compute_livret_a(simulation.capital_initial, simulation.versement_mensuel, len(mensuels))

    return SimulationResponse(
        simulation_id=simulation.id,
        etf_ticker=etf_ticker,
        nb_mois=len(mensuels),
        capital_total_investi=capital_total,
        valeur_finale_brute=valeur_finale_brute,
        valeur_finale_nette=valeur_finale_nette,
        gain_net_euros=gain_net_euros,
        gain_net_pct=gain_net_pct,
        cagr_brut=cagr_brut,
        cagr_net=cagr_net,
        valeur_livret_a=valeur_livret_a,
        resultats_mensuels=mensuels,
    )


@router.post("/", response_model=SimulationResponse, status_code=status.HTTP_201_CREATED, summary="Lancer une simulation DCA")
def create_simulation(req: SimulationRequest, db: Session = Depends(get_db)):
    """
    Lance une simulation DCA en backtesting et persiste les résultats en base de données.

    Body:
        - **etf_ticker**: ticker yfinance (ex: 'CW8.PA').
        - **capital_initial**: capital de départ en € (>= 0).
        - **versement_mensuel**: montant mensuel investi en € (> 0).
        - **date_debut**: début de la période (format YYYY-MM-DD).
        - **date_fin**: fin de la période (format YYYY-MM-DD, > date_debut).
        - **ter**: TER annuel en décimal (ex: 0.0012 pour 0.12 %; entre 0 et 0.05).

    Returns:
        Résultats mensuels + métriques de synthèse (CAGR, gain net, comparaison Livret A).
    """
    try:
        etf = get_or_create_etf(req.etf_ticker, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        prix_df = get_historique_by_dates(req.etf_ticker, req.date_debut, req.date_fin, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Impossible de récupérer les cours : {e}")

    if prix_df.empty:
        raise HTTPException(
            status_code=400,
            detail=f"Aucun cours disponible pour '{req.etf_ticker}' sur la période demandée."
        )

    raw_results = run_dca_simulation(
        prix_df, req.capital_initial, req.versement_mensuel, req.date_debut, req.date_fin, req.ter
    )

    simulation = Simulation(
        etf_id=etf.id,
        capital_initial=req.capital_initial,
        versement_mensuel=req.versement_mensuel,
        date_debut=req.date_debut,
        date_fin=req.date_fin,
    )
    db.add(simulation)
    db.flush()

    db.bulk_insert_mappings(
        ResultatSimulation,
        [{"simulation_id": simulation.id, **r} for r in raw_results],
    )
    db.commit()
    db.refresh(simulation)

    resultats = (
        db.query(ResultatSimulation)
        .filter(ResultatSimulation.simulation_id == simulation.id)
        .order_by(ResultatSimulation.mois)
        .all()
    )
    return _build_response(simulation, resultats, etf.ticker)


@router.get("/{simulation_id}", response_model=SimulationResponse, summary="Résultats d'une simulation existante")
def get_simulation(simulation_id: int, db: Session = Depends(get_db)):
    """
    Récupère les résultats d'une simulation DCA précédemment enregistrée.

    - **simulation_id**: identifiant de la simulation (retourné lors du POST /simulation/).

    Returns:
        Mêmes données que POST /simulation/ sans relancer le calcul.

    Raises:
        404 si la simulation n'existe pas.
    """
    simulation = db.query(Simulation).filter(Simulation.id == simulation_id).first()
    if not simulation:
        raise HTTPException(status_code=404, detail=f"Simulation #{simulation_id} non trouvée")

    etf = db.query(ETF).filter(ETF.id == simulation.etf_id).first()
    resultats = (
        db.query(ResultatSimulation)
        .filter(ResultatSimulation.simulation_id == simulation_id)
        .order_by(ResultatSimulation.mois)
        .all()
    )
    return _build_response(simulation, resultats, etf.ticker if etf else "")
