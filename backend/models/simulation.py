from sqlalchemy import Column, Date, DateTime, Float, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Simulation(Base):
    __tablename__ = "simulation"

    id = Column(Integer, primary_key=True, index=True)
    etf_id = Column(Integer, ForeignKey("etf.id"), nullable=False)
    capital_initial = Column(Float, nullable=False, default=0.0)
    versement_mensuel = Column(Float, nullable=False)
    date_debut = Column(Date, nullable=False)
    date_fin = Column(Date, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    etf = relationship("ETF", back_populates="simulations")
    resultats = relationship("ResultatSimulation", back_populates="simulation", cascade="all, delete-orphan")


class ResultatSimulation(Base):
    __tablename__ = "resultat_simulation"

    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(Integer, ForeignKey("simulation.id", ondelete="CASCADE"), nullable=False)
    mois = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    prix_cloture = Column(Float, nullable=False)
    parts_achetees = Column(Float, nullable=False)
    parts_cumulees = Column(Float, nullable=False)
    valeur_brute = Column(Float, nullable=False)
    valeur_nette = Column(Float, nullable=False)
    capital_investi = Column(Float, nullable=False)

    simulation = relationship("Simulation", back_populates="resultats")
