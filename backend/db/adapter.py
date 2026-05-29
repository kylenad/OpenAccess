import os
from db.postgres import PostgresAdapter
from db.base import DbAdapter


def create_adapter() -> DbAdapter:
    db_type = os.getenv("DB_TYPE", "postgres").lower()

    if db_type == "postgres":
        return PostgresAdapter()

    raise ValueError(f'Unknown DB_TYPE "{db_type}". Set DB_TYPE to "postgres" in your .env file.')

        


