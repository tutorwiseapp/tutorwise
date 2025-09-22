# tutorwise-railway-backend/app/db.py
import os
import redis
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

# Initialize clients as None
redis_client = None
neo4j_driver = None

# Initialize Redis with lazy connection
redis_url = os.getenv("REDIS_URL")
if redis_url:
    print(f"Redis URL configured: {redis_url}")
    # Create Redis client but don't test connection yet (lazy loading)
    redis_client = redis.from_url(
        redis_url,
        decode_responses=True,
        socket_connect_timeout=10,
        socket_timeout=10,
        retry_on_timeout=True,
        health_check_interval=30
    )
    print("Redis client initialized (connection will be tested on first use)")
else:
    print("REDIS_URL environment variable not set")

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