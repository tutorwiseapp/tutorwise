# tutorwise-railway-backend/app/main.py
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import API routes
from app.api import dev_routes, health, account

# Import database management functions
from app.db import shutdown_database_connections, startup_database_connections

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Only load .env in development
if os.getenv("ENV") == "development":
    from dotenv import load_dotenv
    load_dotenv()
    logger.info("Loaded environment variables from .env file")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up Tutorwise AI Backend...")
    try:
        await startup_database_connections()
        logger.info("Database connections initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database connections: {e}")
        # Continue startup - let health checks handle the errors

    yield

    # Shutdown
    logger.info("Shutting down Tutorwise AI Backend...")
    try:
        await shutdown_database_connections()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

app = FastAPI(
    title="Tutorwise AI Backend",
    description="API for Tutorwise services and AI agents.",
    version="1.0.0",
    lifespan=lifespan
)

# Get CORS origins from environment
allowed_origins = os.getenv("ALLOWED_ORIGINS")
if allowed_origins:
    origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
else:
    # Default to no origins in production - must be explicitly set
    origins = []
    logger.warning("ALLOWED_ORIGINS not set - CORS will block all origins")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(dev_routes.router)
app.include_router(account.router)

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the Tutorwise AI Backend"}
