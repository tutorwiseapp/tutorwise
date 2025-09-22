# tutorwise-railway-backend/app/db.py
import os
import logging
import asyncio
from typing import Optional
import redis
from neo4j import GraphDatabase
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global database clients
redis_client: Optional[redis.Redis] = None
neo4j_driver: Optional[GraphDatabase.driver] = None

class DatabaseError(Exception):
    """Custom exception for database connection errors"""
    pass

def get_redis_config():
    """Get Redis configuration from environment variables"""
    redis_url = os.getenv("REDIS_URL")
    redis_public_url = os.getenv("REDIS_PUBLIC_URL")

    if not redis_url and not redis_public_url:
        raise DatabaseError("Redis configuration missing: Neither REDIS_URL nor REDIS_PUBLIC_URL is set")

    # Prefer public URL if available
    if redis_public_url:
        logger.info("Using REDIS_PUBLIC_URL for connection")
        return redis_public_url

    # Handle Railway internal URL by constructing public endpoint
    if redis_url and "redis.railway.internal" in redis_url:
        import re
        match = re.search(r'redis://default:([^@]+)@', redis_url)
        if match:
            password = match.group(1)
            public_url = f"redis://default:{password}@shinkansen.proxy.rlwy.net:20154"
            logger.info("Constructed public Redis URL from private URL")
            return public_url
        else:
            logger.warning("Could not extract password from private Redis URL")

    logger.info("Using REDIS_URL for connection")
    return redis_url

def get_neo4j_config():
    """Get Neo4j configuration from environment variables"""
    neo4j_uri = os.getenv("NEO4J_URI")
    neo4j_user = os.getenv("NEO4J_USERNAME")
    neo4j_password = os.getenv("NEO4J_PASSWORD")

    if not all([neo4j_uri, neo4j_user, neo4j_password]):
        raise DatabaseError("Neo4j configuration incomplete: NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD must all be set")

    return neo4j_uri, neo4j_user, neo4j_password

async def connect_redis(max_retries: int = 3, base_delay: float = 1.0) -> Optional[redis.Redis]:
    """Connect to Redis with retry logic"""
    global redis_client

    try:
        redis_url = get_redis_config()

        for attempt in range(max_retries):
            try:
                client = redis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_connect_timeout=10,
                    socket_timeout=10,
                    retry_on_timeout=True,
                    health_check_interval=30
                )

                # Test connection
                client.ping()
                redis_client = client
                logger.info("Successfully connected to Redis")
                return client

            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"Failed to connect to Redis after {max_retries} attempts: {e}")
                    raise DatabaseError(f"Redis connection failed: {e}")
                else:
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"Redis connection attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                    await asyncio.sleep(delay)

    except DatabaseError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error connecting to Redis: {e}")
        raise DatabaseError(f"Unexpected Redis connection error: {e}")

async def connect_neo4j(max_retries: int = 3, base_delay: float = 1.0) -> Optional[GraphDatabase.driver]:
    """Connect to Neo4j with retry logic"""
    global neo4j_driver

    try:
        neo4j_uri, neo4j_user, neo4j_password = get_neo4j_config()

        for attempt in range(max_retries):
            try:
                driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
                driver.verify_connectivity()
                neo4j_driver = driver
                logger.info("Successfully connected to Neo4j")
                return driver

            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"Failed to connect to Neo4j after {max_retries} attempts: {e}")
                    raise DatabaseError(f"Neo4j connection failed: {e}")
                else:
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"Neo4j connection attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                    await asyncio.sleep(delay)

    except DatabaseError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error connecting to Neo4j: {e}")
        raise DatabaseError(f"Unexpected Neo4j connection error: {e}")

async def startup_database_connections():
    """Initialize database connections on startup"""
    logger.info("Initializing database connections...")

    # Connect to Redis
    try:
        await connect_redis()
    except DatabaseError as e:
        logger.error(f"Redis startup failed: {e}")
        # Continue without Redis - let health check handle the error

    # Connect to Neo4j
    try:
        await connect_neo4j()
    except DatabaseError as e:
        logger.error(f"Neo4j startup failed: {e}")
        # Continue without Neo4j - let health check handle the error

async def shutdown_database_connections():
    """Clean up database connections on shutdown"""
    global redis_client, neo4j_driver

    logger.info("Shutting down database connections...")

    if redis_client:
        try:
            await redis_client.aclose()
            logger.info("Redis connection closed")
        except Exception as e:
            logger.error(f"Error closing Redis connection: {e}")

    if neo4j_driver:
        try:
            neo4j_driver.close()
            logger.info("Neo4j connection closed")
        except Exception as e:
            logger.error(f"Error closing Neo4j connection: {e}")

    redis_client = None
    neo4j_driver = None