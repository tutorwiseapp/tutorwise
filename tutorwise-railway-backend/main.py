import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import the new API routers
from api import health, dev_routes
# Import the driver from our new, central client file
from db_client import neo4j_driver

# Load environment variables (now only needed for ALLOWED_ORIGINS)
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

# Startup connection logic is no longer needed here

@app.on_event("shutdown")
def shutdown_event():
    if neo4j_driver:
        neo4j_driver.close()

# Include API Routers
app.include_router(health.router)
app.include_router(dev_routes.router)

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the Tutorwise AI Backend"}