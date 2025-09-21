import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Import the new API routers
from api import health, dev_routes

# Load environment variables from .env file
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

# --- Database connections ---
# These are defined globally so they can be imported by the routers
redis_client = None
neo4j_driver = None

@app.on_event("startup")
def startup_event():
    global redis_client, neo4j_driver
    # Connect to Redis
    try:
        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            raise ValueError("REDIS_URL environment variable not set")
        redis_client = redis.from_url(redis_url, decode_responses=True)
        redis_client.ping()
        print("Successfully connected to Redis.")
    except Exception as e:
        print(f"Error connecting to Redis: {e}")

    # Connect to Neo4j
    try:
        neo4j_uri = os.getenv("NEO4J_URI")
        neo4j_user = os.getenv("NEO4J_USERNAME")
        neo4j_password = os.getenv("NEO4J_PASSWORD")
        if not all([neo4j_uri, neo4j_user, neo4j_password]):
             raise ValueError("NEO4J environment variables not fully set")
        neo4j_driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
        neo4j_driver.verify_connectivity()
        print("Successfully connected to Neo4j.")
    except Exception as e:
        print(f"Error connecting to Neo4j: {e}")


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

