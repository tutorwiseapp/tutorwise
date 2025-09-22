# tutorwise-railway-backend/app/db.py
import os
import redis
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

# Initialize clients as None
redis_client = None
neo4j_driver = None

# Initialize Redis with Railway environment variables
redis_url = os.getenv("REDIS_URL")
redis_host = os.getenv("REDISHOST")
redis_port = os.getenv("REDISPORT", "6379")
redis_password = os.getenv("REDISPASSWORD")

print(f"Redis configuration:")
print(f"  REDIS_URL: {redis_url}")
print(f"  REDISHOST: {redis_host}")
print(f"  REDISPORT: {redis_port}")
print(f"  REDISPASSWORD: {'***' if redis_password else 'None'}")

if redis_host and redis_password:
    # Use Railway's individual variables
    print(f"Using Railway Redis variables: {redis_host}:{redis_port}")
    redis_client = redis.Redis(
        host=redis_host,
        port=int(redis_port),
        password=redis_password,
        decode_responses=True,
        socket_connect_timeout=10,
        socket_timeout=10,
        retry_on_timeout=True,
        health_check_interval=30
    )
    print("Redis client initialized using Railway variables")
elif redis_url:
    # Fallback to URL format
    print(f"Using Redis URL: {redis_url}")
    redis_client = redis.from_url(
        redis_url,
        decode_responses=True,
        socket_connect_timeout=10,
        socket_timeout=10,
        retry_on_timeout=True,
        health_check_interval=30
    )
    print("Redis client initialized using URL")
else:
    print("No Redis configuration found")

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