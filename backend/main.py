# Libraries---------------------------------
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import uvicorn
from db.adapter import create_adapter
from db.base import DbAdapter
from pydantic import BaseModel
#-------------------------------------------

#env global variables
load_dotenv()

db: DbAdapter = None

# Class Models------------------------------
class UpdateCell(BaseModel):
    pk_col: str
    pk_val: str | int
    column: str
    value: str | int | float | None

class InsertRow(BaseModel):
    values: dict[str, str | int | float | None]

class DeleteRow(BaseModel):
    pk_col: str
    pk_val: str | int
#-------------------------------------------

def validate_table(table: str):
    tables = db.list_tables()
    if table not in tables:
        raise HTTPException(status_code = 404, detail = f'Table "{table}" not found.')

def validate_column(table: str, column: str):
    columns = db.get_columns(table)
    column_names = [col["name"] for col in columns]
    if column not in column_names:
        raise HTTPException(status_code = 400, detail = f'Column "{column}" not found in table "{table}"')

# Routes------------------------------------
# Startup/shutdown function
@asynccontextmanager
async def lifespan(app: FastAPI):
    global db
    db = create_adapter()
    print("Database connected!")
    yield
    db.close()
    print("Database disconnected.")

app = FastAPI(lifespan = lifespan)

@app.get("/health")
def health():
    return{"status": "ok"}

@app.get("/api/tables")
def get_tables():
    return {"tables": db.list_tables()}

@app.get("/api/tables/{table}/columns")
def get_columns(table: str):
    validate_table(table)
    return {"columns": db.get_columns(table)}


@app.get("/api/tables/{table}/rows")
def get_rows(table: str):
    validate_table(table)
    return {"rows": db.get_rows(table)}  

@app.patch("/api/tables/{table}/rows")
def update_row(table: str, body: UpdateCell):
    validate_table(table)
    validate_column(table, body.column)
    db.update_cell(table, body.pk_col, body.pk_val, body.column, body.value)
    return {"ok": True}

@app.post("/api/tables/{table}/rows")
def insert_row(table: str, body: InsertRow):
    validate_table(table)
    for col in body.values.keys():
        validate_column(table, col)
    db.insert_row(table, body.values)
    return {"ok": True}

@app.delete("/api/tables/{table}/rows")
def delete_row(table, body: DeleteRow):
    validate_table(table)
    db.delete_row(table, body.pk_col, body.pk_val)
    return {"ok": True}
#----------------------------------------------------


if __name__ == "__main__":
    uvicorn.run("main:app", host = "0.0.0.0", port = 8000, reload = True)



