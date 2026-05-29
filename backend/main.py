# Libraries---------------------------------
from fastapi import FastAPI
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import uvicorn
from db.adapter import create_adapter
from db.base import DbAdapter
#-------------------------------------------

#env global variables
load_dotenv()

db: DbAdapter = None

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
    return {"columns": db.get_columns(table)}


@app.get("/api/tables/{table}/rows")
def get_rows(table: str):
    return {"rows": db.get_rows(table)}  

if __name__ == "__main__":
    uvicorn.run("main:app", host = "0.0.0.0", port = 8000, reload = True)



