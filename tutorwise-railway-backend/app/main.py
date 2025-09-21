import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Use the new absolute import path
from app.api import health, dev_routes
from app.db import neo4j_driver

load_dotenv()

app = FastAPI(
    title="Tutorwise AI Backend",
    description="API for Tutorwise services and AI agents.",
    version="1.0.0"
)

origins = os.getenv("ALLOWED_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
def shutdown_event():
    if neo4j_driver:
        neo4j_driver.close()

app.include_router(health.router)
app.include_router(dev_routes.router)

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the Tutorwise AI Backend"}