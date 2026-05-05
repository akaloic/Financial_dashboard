from datetime import date
from typing import List, Optional
from pydantic import BaseModel


class RegressionRequest(BaseModel):
    etf_ticker: str
    date_debut: date
    date_fin: date


class HistoriqueRegressionPoint(BaseModel):
    date: date
    adj_close: float
    y_pred: float
    ic_low: float = 0.0
    ic_high: float = 0.0
    residue: float


class ProjectionPoint(BaseModel):
    date: date
    y_pred: float
    ic_low: float
    ic_high: float


class Interpretation(BaseModel):
    avertissement: str
    tendance_journaliere_euros: float
    projection_12m_disclaimer: str


class RegressionResponse(BaseModel):
    regression_id: int
    etf_ticker: str
    periode_debut: date
    periode_fin: date
    beta0: float
    beta1: float
    r_squared: float
    p_value: float
    std_error: float
    durbin_watson: Optional[float] = None
    nb_observations: int
    interpretation: Interpretation
    donnees_historiques: List[HistoriqueRegressionPoint]
    projection: List[ProjectionPoint]
