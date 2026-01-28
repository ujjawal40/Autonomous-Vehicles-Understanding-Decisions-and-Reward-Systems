"""
Database Connection Manager

Handles PostgreSQL connection using SQLAlchemy with async support.
"""

import os
from typing import Generator, Optional
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

# Database configuration
DATABASE_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'user': os.getenv('DB_USER', 'adv_user'),
    'password': os.getenv('DB_PASSWORD', 'adv_secret_2024'),
    'database': os.getenv('DB_NAME', 'autonomous_decision_visualizer'),
}


def get_database_url() -> str:
    """Construct database URL from configuration."""
    return (
        f"postgresql://{DATABASE_CONFIG['user']}:{DATABASE_CONFIG['password']}"
        f"@{DATABASE_CONFIG['host']}:{DATABASE_CONFIG['port']}"
        f"/{DATABASE_CONFIG['database']}"
    )


class Database:
    """
    Database connection manager.

    Provides connection pooling and session management for PostgreSQL.
    """

    _instance: Optional['Database'] = None
    _engine = None
    _session_factory = None

    def __new__(cls):
        """Singleton pattern for database connection."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize database connection if not already done."""
        if self._engine is None:
            self._initialize()

    def _initialize(self):
        """Set up database engine and session factory."""
        url = get_database_url()

        self._engine = create_engine(
            url,
            poolclass=QueuePool,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,  # Check connection health
            echo=os.getenv('DB_ECHO', 'false').lower() == 'true',
        )

        self._session_factory = sessionmaker(
            bind=self._engine,
            autocommit=False,
            autoflush=False,
        )

    @property
    def engine(self):
        """Get the database engine."""
        return self._engine

    @contextmanager
    def session(self) -> Generator[Session, None, None]:
        """
        Provide a transactional scope around a series of operations.

        Usage:
            with db.session() as session:
                session.add(obj)
                session.commit()
        """
        session = self._session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def get_session(self) -> Session:
        """
        Get a new session (caller is responsible for closing).

        For dependency injection in FastAPI.
        """
        return self._session_factory()

    def check_connection(self) -> bool:
        """Test database connectivity."""
        try:
            with self._engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception as e:
            print(f"Database connection failed: {e}")
            return False

    def close(self):
        """Close all connections."""
        if self._engine:
            self._engine.dispose()


# Global database instance
_db: Optional[Database] = None


def get_db() -> Database:
    """Get the global database instance."""
    global _db
    if _db is None:
        _db = Database()
    return _db


def get_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency for database sessions.

    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_session)):
            return db.query(Item).all()
    """
    db = get_db()
    session = db.get_session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
