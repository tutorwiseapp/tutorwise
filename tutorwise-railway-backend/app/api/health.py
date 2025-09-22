# app/api/health.py
from fastapi import APIRouter, HTTPException
from app.db import redis_client, neo4j_driver

router = APIRouter()

@router.get("/health", tags=["Health"])
async def health_check():
    # Check Redis with proper error handling
    redis_status = "error"
    try:
        if redis_client:
            redis_client.ping()
            redis_status = "ok"
    except Exception as e:
        print(f"Redis health check failed: {e}")
        redis_status = "error"
    
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