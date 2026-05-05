from datetime import date
from typing import List, Optional
from pydantic import BaseModel


class ETFResponse(BaseModel):
    id: int
    ticker: str
    nom: Optional[str] = None
    indice: Optional[str] = None
    gestionnaire: Optional[str] = None
    ter: Optional[float] = None
    eligible_pea: Optional[bool] = None
    devise: Optional[str] = None
    derniere_date_cours: Optional[date] = None

    model_config = {"from_attributes": True}


class HistoriquePoint(BaseModel):
    date: date
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: float
    adj_close: Optional[float] = None
    volume: Optional[int] = None


class HistoriqueResponse(BaseModel):
    ticker: str
    period: str
    nb_points: int
    data: List[HistoriquePoint]
