from sqlalchemy import (
    Boolean, Column, Date, Float, Integer,
    String, BigInteger, DateTime, ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class ETF(Base):
    __tablename__ = "etf"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), unique=True, nullable=False)
    nom = Column(String(200))
    indice = Column(String(200))
    gestionnaire = Column(String(100))
    ter = Column(Float)
    eligible_pea = Column(Boolean)
    devise = Column(String(10))
    created_at = Column(DateTime, server_default=func.now())

    cours = relationship("CoursHistorique", back_populates="etf", cascade="all, delete-orphan")
    simulations = relationship("Simulation", back_populates="etf")
    resultats_regression = relationship("ResultatRegression", back_populates="etf")


class CoursHistorique(Base):
    __tablename__ = "cours_historique"

    id = Column(Integer, primary_key=True, index=True)
    etf_id = Column(Integer, ForeignKey("etf.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float, nullable=False)
    adj_close = Column(Float)
    volume = Column(BigInteger)

    __table_args__ = (UniqueConstraint("etf_id", "date", name="uq_etf_date"),)

    etf = relationship("ETF", back_populates="cours")
