import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import engine, Base
import models  # noqa: F401 — registers all ORM models before create_all

load_dotenv()

app = FastAPI(
    title="Simulateur de Portefeuille Passif",
    description="API de backtesting DCA et régression linéaire sur ETF (M2 MIAGE — Projet DATA)",
    version="1.0.0",
)

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_tables() -> None:
    """Create all tables and seed ETF metadata from CSV on startup."""
    Base.metadata.create_all(bind=engine)
    _seed_etfs()


def _seed_etfs() -> None:
    """Insert ETF rows from etf_metadata.csv if they are not already in the database."""
    from database import SessionLocal
    from services.etf_fetcher import _METADATA, get_or_create_etf
    db = SessionLocal()
    try:
        for ticker in _METADATA:
            get_or_create_etf(ticker, db)
    finally:
        db.close()


@app.get("/", tags=["health"])
def health_check() -> dict:
    """
    Vérifie que l'API est opérationnelle.

    Returns:
        dict: {"status": "ok"}
    """
    return {"status": "ok"}


from routers import etf, simulation, regression

app.include_router(etf.router, prefix="/etf", tags=["ETF"])
app.include_router(simulation.router, prefix="/simulation", tags=["Simulation DCA"])
app.include_router(regression.router, prefix="/regression", tags=["Régression OLS"])

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
