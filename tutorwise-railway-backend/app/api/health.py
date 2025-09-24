# app/api/health.py
import asyncio
import logging
from typing import Any

from fastapi import APIRouter

from app.db import neo4j_driver, redis_client

logger = logging.getLogger(__name__)
router = APIRouter()

async def check_redis_health() -> dict[str, Any]:
    """Check Redis health with proper error handling"""
    # Use global client if available, otherwise create a temporary one for health check
    client_to_use = redis_client

    if not client_to_use:
        try:
            # Create a temporary client for health check
            from app.db import get_redis_config
            redis_url = get_redis_config()
            import redis
            client_to_use = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
        except Exception as e:
            return {
                "status": "not_configured",
                "message": f"Redis configuration unavailable: {str(e)}",
                "details": None
            }

    for attempt in range(3):
        try:
            # Test Redis connection
            client_to_use.ping()
            return {
                "status": "ok",
                "message": "Redis is healthy",
                "details": None
            }
        except Exception as e:
            error_msg = str(e)
            logger.warning(f"Redis health check attempt {attempt + 1}/3 failed: {error_msg}")

            if attempt == 2:  # Last attempt
                return {
                    "status": "error",
                    "message": "Redis connection failed",
                    "details": error_msg
                }
            else:
                await asyncio.sleep(1)  # Wait 1 second between retries

    # This should never be reached due to the loop logic above
    return {
        "status": "error",
        "message": "Redis health check failed unexpectedly",
        "details": "All retry attempts failed"
    }

async def check_neo4j_health() -> dict[str, Any]:
    """Check Neo4j health with proper error handling"""
    # Use global driver if available, otherwise create a temporary one for health check
    driver_to_use = neo4j_driver

    if not driver_to_use:
        try:
            # Create a temporary driver for health check
            from app.db import get_neo4j_config
            from neo4j import GraphDatabase
            neo4j_uri, neo4j_user, neo4j_password = get_neo4j_config()
            driver_to_use = GraphDatabase.driver(
                neo4j_uri,
                auth=(neo4j_user, neo4j_password),
                connection_timeout=10,
                max_connection_lifetime=300
            )
        except Exception as e:
            return {
                "status": "not_configured",
                "message": f"Neo4j configuration unavailable: {str(e)}",
                "details": None
            }

    try:
        # Test Neo4j connection
        driver_to_use.verify_connectivity()
        return {
            "status": "ok",
            "message": "Neo4j is healthy",
            "details": None
        }
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Neo4j health check failed: {error_msg}")
        return {
            "status": "error",
            "message": "Neo4j connection failed",
            "details": error_msg
        }

@router.get("/health", tags=["Health"])
async def health_check():
    """
    Comprehensive health check endpoint.
    Always returns 200 OK with detailed status information.
    """
    try:
        # Run health checks concurrently
        redis_health, neo4j_health = await asyncio.gather(
            check_redis_health(),
            check_neo4j_health()
        )

        # Determine overall status
        redis_ok = redis_health["status"] == "ok"
        neo4j_ok = neo4j_health["status"] == "ok"

        if redis_ok and neo4j_ok:
            overall_status = "ok"
        elif redis_health["status"] == "not_configured" or neo4j_health["status"] == "not_configured":
            overall_status = "degraded"
        else:
            overall_status = "degraded"

        return {
            "status": overall_status,
            "timestamp": asyncio.get_event_loop().time(),
            "services": {
                "redis": redis_health,
                "neo4j": neo4j_health
            }
        }

    except Exception as e:
        # This should never happen, but provide a fallback
        logger.error(f"Unexpected error in health check: {e}")
        return {
            "status": "error",
            "timestamp": asyncio.get_event_loop().time(),
            "message": "Health check system error",
            "details": str(e),
            "services": {
                "redis": {"status": "unknown", "message": "Health check failed", "details": None},
                "neo4j": {"status": "unknown", "message": "Health check failed", "details": None}
            }
        }
