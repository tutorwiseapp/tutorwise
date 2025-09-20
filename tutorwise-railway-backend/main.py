import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load environment variables from .env file for local development
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# --- CORS Configuration ---
# Get the allowed origins from an environment variable
allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Connections ---
redis_client = None
neo4j_driver = None

@app.on_event("startup")
def startup_event():
    global redis_client, neo4j_driver
    # Connect to Redis
    try:
        redis_client = redis.Redis(
            host=os.getenv("REDIS_HOST"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            password=os.getenv("REDIS_PASSWORD"),
            username=os.getenv("REDIS_USER"),
            decode_responses=True
        )
        redis_client.ping()
        print("Successfully connected to Redis.")
    except Exception as e:
        print(f"Error connecting to Redis: {e}")

    # Connect to Neo4j
    try:
        uri = os.getenv("NEO4J_URI")
        user = os.getenv("NEO4J_USERNAME")
        password = os.getenv("NEO4J_PASSWORD")
        neo4j_driver = GraphDatabase.driver(uri, auth=(user, password))
        neo4j_driver.verify_connectivity()
        print("Successfully connected to Neo4j.")
    except Exception as e:
        print(f"Error connecting to Neo4j: {e}")


@app.on_event("shutdown")
def shutdown_event():
    if neo4j_driver:
        neo4j_driver.close()
        print("Neo4j connection closed.")

# --- API Endpoints ---
@app.get("/health")
def health_check():
    """Health check endpoint to verify service is running."""
    redis_connected = False
    if redis_client:
        try:
            redis_connected = redis_client.ping()
        except Exception:
            redis_connected = False
            
    return {"status": "ok", "redis_connected": redis_connected, "neo4j_connected": neo4j_driver is not None}

# --- Placeholder for future AI logic ---
# Example: Get recommendations for a user
@app.get("/recommendations/{user_id}")
def get_recommendations(user_id: str):
    # In the future, you would query Neo4j here
    # For now, we return mock data
    return {"user_id": user_id, "recommendations": ["Math Tutor", "Science Project Helper"]}