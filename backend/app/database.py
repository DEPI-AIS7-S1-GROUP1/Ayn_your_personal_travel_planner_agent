"""Database connection: engine, sessions and the declarative Base."""

import sqlite3

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import DATABASE_URL


class Base(DeclarativeBase):
    """Parent class of every table in app/models.py."""


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record):
    # SQLite ignores foreign keys (and ON DELETE CASCADE) unless this is
    # switched on for every new connection. PostgreSQL always enforces them.
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def make_engine(url: str, **kwargs) -> Engine:
    connect_args = {}
    if url.startswith("sqlite"):
        # Let the web server use the connection from different threads.
        connect_args["check_same_thread"] = False
    return create_engine(url, connect_args=connect_args, **kwargs)


engine = make_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
