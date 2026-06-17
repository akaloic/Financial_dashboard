import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()


def _resolve_database_url() -> str:
    """Résout l'URL de base de données.

    - Si DATABASE_URL est défini → on l'utilise (PostgreSQL en prod / Neon / Railway…).
      Les hébergeurs fournissent parfois le préfixe historique ``postgres://`` que
      SQLAlchemy 2.x ne reconnaît plus : on le normalise en ``postgresql://``.
    - Sinon → fallback SQLite mono-fichier. L'application tourne ainsi *sans aucune
      dépendance externe*, ce qui la rend déployable gratuitement n'importe où
      (Render, Hugging Face Spaces, conteneur…) sans provisionner de base.
    """
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        db_path = os.getenv("SQLITE_PATH", str(Path(__file__).parent / "portfolio.db"))
        return f"sqlite:///{db_path}"
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


DATABASE_URL = _resolve_database_url()
IS_SQLITE = DATABASE_URL.startswith("sqlite")

# SQLite a besoin de check_same_thread=False pour être partagé entre threads FastAPI.
_connect_args = {"check_same_thread": False} if IS_SQLITE else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args, pool_pre_ping=not IS_SQLITE)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Yield a database session and ensure it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
