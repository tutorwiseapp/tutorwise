from fastapi import APIRouter, HTTPException
# Use the new absolute import path
from app.db import redis_client, neo4j_driver

router = APIRouter()

@router.get("/health", tags=["Health"])
async def health_check():
    redis_status = "ok" if redis_client and redis_client.ping() else "error"
    neo4j_status = "error"
    try:
        if neo4j_driver:
            neo4j_driver.verify_connectivity()
            neo4j_status = "ok"
    except Exception:
        pass

    if redis_status == "ok" and neo4j_status == "ok":
        return {"status": "ok", "redis": redis_status, "neo4j": neo4j_status}
    else:
        raise HTTPException(
            status_code=503,
            detail={"status": "error", "redis": redis_status, "neo4j": neo4j_status}
        )