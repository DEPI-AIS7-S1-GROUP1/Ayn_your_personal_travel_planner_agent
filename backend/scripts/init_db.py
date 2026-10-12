"""Create all tables in the database configured by DATABASE_URL.

Run from backend/:
    python -m scripts.init_db

Safe to run more than once: existing tables are left untouched. After a schema
change during development, delete the local .db file and run it again.
"""

from sqlalchemy import inspect

from app import models  # noqa: F401  (registers the tables on Base)
from app.database import Base, engine


def main() -> None:
    Base.metadata.create_all(engine)
    # hide_password: a PostgreSQL URL contains credentials.
    print(f"Database: {engine.url.render_as_string(hide_password=True)}")
    print("Tables:", ", ".join(sorted(inspect(engine).get_table_names())))


if __name__ == "__main__":
    main()
