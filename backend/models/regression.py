from sqlalchemy import Column, Date, DateTime, Float, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class ResultatRegression(Base):
    __tablename__ = "resultat_regression"

    id = Column(Integer, primary_key=True, index=True)
    etf_id = Column(Integer, ForeignKey("etf.id"), nullable=False)
    date_calcul = Column(DateTime, server_default=func.now())
    periode_debut = Column(Date)
    periode_fin = Column(Date)
    beta0 = Column(Float, nullable=False)
    beta1 = Column(Float, nullable=False)
    r_squared = Column(Float, nullable=False)
    p_value = Column(Float, nullable=False)
    std_error = Column(Float, nullable=False)
    durbin_watson = Column(Float)
    nb_observations = Column(Integer)
    projection_json = Column(Text)  # JSON: [{date, valeur_pred, ic_low, ic_high}]

    etf = relationship("ETF", back_populates="resultats_regression")
