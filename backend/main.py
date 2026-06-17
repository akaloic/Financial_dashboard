import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import engine, Base, SessionLocal, IS_SQLITE
import models  # noqa: F401 — registers all ORM models before create_all

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")


def _seed_etfs() -> None:
    """Insère les ETF de etf_metadata.csv puis amorce l'historique depuis le snapshot."""
    from services.etf_fetcher import get_or_create_etf, seed_history_from_snapshot, _METADATA
    db = SessionLocal()
    try:
        for ticker in _METADATA:
            get_or_create_etf(ticker, db)
        inserted = seed_history_from_snapshot(db)
        if inserted:
            logger.info("Snapshot embarqué chargé : %d lignes de cours.", inserted)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Crée les tables et amorce les données au démarrage (remplace on_event déprécié)."""
    Base.metadata.create_all(bind=engine)
    _seed_etfs()
    logger.info("API prête (backend %s).", "SQLite" if IS_SQLITE else "PostgreSQL")
    yield


app = FastAPI(
    title="Simulateur de Portefeuille Passif",
    description="API de backtesting DCA et régression linéaire sur ETF (M2 MIAGE — Projet DATA)",
    version="1.1.0",
    lifespan=lifespan,
)

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["health"])
def health_check() -> dict:
    """
    Vérifie que l'API est opérationnelle.

    Returns:
        dict: {"status": "ok", "backend": "sqlite" | "postgresql"}
    """
    return {"status": "ok", "backend": "sqlite" if IS_SQLITE else "postgresql"}


from routers import etf, simulation, regression

app.include_router(etf.router, prefix="/etf", tags=["ETF"])
app.include_router(simulation.router, prefix="/simulation", tags=["Simulation DCA"])
app.include_router(regression.router, prefix="/regression", tags=["Régression OLS"])

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
