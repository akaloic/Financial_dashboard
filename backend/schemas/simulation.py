from datetime import date
from typing import List
from pydantic import BaseModel, Field, model_validator


class SimulationRequest(BaseModel):
    etf_ticker: str
    capital_initial: float = Field(0.0, ge=0)
    versement_mensuel: float = Field(..., gt=0)
    date_debut: date
    date_fin: date
    ter: float = Field(..., ge=0, le=0.05)

    @model_validator(mode="after")
    def check_dates(self) -> "SimulationRequest":
        if self.date_debut >= self.date_fin:
            raise ValueError("date_debut doit être antérieure à date_fin")
        return self


class ResultatMensuel(BaseModel):
    mois: int
    date: date
    prix_cloture: float
    parts_achetees: float
    parts_cumulees: float
    valeur_brute: float
    valeur_nette: float
    capital_investi: float


class MetriquesRisque(BaseModel):
    volatilite_annualisee: float
    sharpe: float
    sortino: float
    max_drawdown: float
    meilleur_mois: float
    pire_mois: float
    profil_risque: str
    note: str


class SimulationResponse(BaseModel):
    simulation_id: int
    etf_ticker: str
    nb_mois: int
    capital_total_investi: float
    valeur_finale_brute: float
    valeur_finale_nette: float
    gain_net_euros: float
    gain_net_pct: float
    cagr_brut: float
    cagr_net: float
    valeur_livret_a: float
    metriques_risque: MetriquesRisque
    resultats_mensuels: List[ResultatMensuel]
