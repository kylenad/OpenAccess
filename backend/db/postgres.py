# Libraries
import psycopg2
import os
from db.base import DbAdapter

class PostgresAdapter(DbAdapter):
    def __init__(self):
        self.conn = psycopg2.connect(
            host = os.getenv("PG_HOST"),
            port = os.getenv("PG_PORT"),
            dbname = os.getenv("PG_DATABASE"),
            user = os.getenv("PG_USER"),
            password = os.getenv("PG_PASSWORD")
        )

    def list_tables(self) -> list[str]:
        cursor = self.conn.cursor()
        cursor.execute(
            """--sql
            SELECT tablename
            FROM pg_tables
            where schemaname = 'public'
            ORDER BY tablename
            """
        )
        tables = [row[0] for row in cursor.fetchall()]
        cursor.close()
        return tables

    def get_columns(self, table: str) -> list[dict]:
        cursor = self.conn.cursor()
        cursor.execute(
            """--sql
            SELECT
                column_name,
                data_type,
                is_nullable
                FROM information_schema.columns
                WHERE 
                    table_schema = 'public'
                    AND table_name = %s
                ORDER BY
                    ordinal_position
            """,
            (table,)
        )
        columns = [
            {"name": row[0], "type": row[1], "nullable": row[2] == "YES"}
            for row in cursor.fetchall()
        ]
        cursor.close()

        return columns
        
    def get_rows(self, table: str) -> list[dict]:
        cursor = self.conn.cursor()
        cursor.execute(f'SELECT * FROM "{table}" LIMIT 1000')
        columns = [desc[0] for desc in cursor.description]
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
        cursor.close()
        return rows

    def close(self) -> None:
        self.conn.close()
