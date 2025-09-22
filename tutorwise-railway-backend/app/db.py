# tutorwise-railway-backend/app/db.py
import os
import redis
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

# Initialize clients as None
redis_client = None
neo4j_driver = None

# Connect to Redis
try:
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        raise ValueError("REDIS_URL environment variable not set")

    print(f"Attempting to connect to Redis at: {redis_url}")

    # Create Redis client with connection timeout and retry settings
    redis_client = redis.from_url(
        redis_url,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5,
        retry_on_timeout=True,
        health_check_interval=30
    )

    # Test the connection
    redis_client.ping()
    print("Successfully connected to Redis.")
except Exception as e:
    print(f"Error connecting to Redis: {e}")
    print(f"Redis URL format: {redis_url if redis_url else 'Not set'}")

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