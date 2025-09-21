import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import the new API routers
from api import health, dev_routes
# Import the database driver from our new client file
from db_client import neo4j_driver

# Load environment variables from .env file
# This is now only needed for ALLOWED_ORIGINS
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title="Tutorwise AI Backend",
    description="API for Tutorwise services and AI agents.",
    version="1.0.0"
)

# CORS configuration
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://tutorwise.vercel.app").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The startup logic is no longer needed here, as connections are handled in db_client.py

@app.on_event("shutdown")
def shutdown_event():
    if neo4j_driver:
        neo4j_driver.close()

# --- Include API Routers ---
# This keeps the main file clean and organized
app.include_router(health.router)
app.include_router(dev_routes.router)

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the Tutorwise AI Backend"}