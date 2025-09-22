# app/api/health.py
from fastapi import APIRouter
from app.db import redis_client, neo4j_driver

router = APIRouter()

@router.get("/health", tags=["Health"])
async def health_check():
    # Check Redis with proper error handling and retries
    redis_status = "error"
    if redis_client:
        for attempt in range(3):  # Try 3 times
            try:
                redis_client.ping()
                redis_status = "ok"
                break
            except Exception as e:
                print(f"Redis health check attempt {attempt + 1} failed: {e}")
                if attempt == 2:  # Last attempt
                    redis_status = "error"
                else:
                    import time
                    time.sleep(1)  # Wait 1 second between retries
    else:
        print("Redis client not initialized")
        redis_status = "not_configured"
    
    # Check Neo4j with proper error handling
    neo4j_status = "error"
    try:
        if neo4j_driver:
            neo4j_driver.verify_connectivity()
            neo4j_status = "ok"
    except Exception as e:
        print(f"Neo4j health check failed: {e}")
        neo4j_status = "error"

    # Return status regardless of individual service health
    return {
        "status": "ok" if redis_status == "ok" and neo4j_status == "ok" else "degraded",
        "redis": redis_status,
        "neo4j": neo4j_status
    }