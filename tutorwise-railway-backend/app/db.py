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
redis_public_url = os.getenv("REDIS_PUBLIC_URL")

print(f"Redis configuration:")
print(f"  REDIS_URL: {redis_url}")
print(f"  REDIS_PUBLIC_URL: {redis_public_url}")

# Try public URL first if available, then fallback to private URL
if redis_public_url:
    print(f"Using public Redis URL: {redis_public_url}")
    redis_client = redis.from_url(
        redis_public_url,
        decode_responses=True,
        socket_connect_timeout=10,
        socket_timeout=10,
        retry_on_timeout=True,
        health_check_interval=30
    )
    print("Redis client initialized using public URL")
elif redis_url:
    # Try to construct public URL from private URL if possible
    if "redis.railway.internal" in redis_url:
        # Extract password from private URL
        import re
        match = re.search(r'redis://default:([^@]+)@', redis_url)
        if match:
            password = match.group(1)
            # Try public endpoint: redis://default:password@shinkansen.proxy.rlwy.net:20154
            public_url = f"redis://default:{password}@shinkansen.proxy.rlwy.net:20154"
            print(f"Attempting public Redis endpoint: {public_url}")
            redis_client = redis.from_url(
                public_url,
                decode_responses=True,
                socket_connect_timeout=10,
                socket_timeout=10,
                retry_on_timeout=True,
                health_check_interval=30
            )
            print("Redis client initialized using constructed public URL")
        else:
            print("Could not extract password from private URL")
            redis_client = None
    else:
        print(f"Using original Redis URL: {redis_url}")
        redis_client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=10,
            socket_timeout=10,
            retry_on_timeout=True,
            health_check_interval=30
        )
        print("Redis client initialized using original URL")
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