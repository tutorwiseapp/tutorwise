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