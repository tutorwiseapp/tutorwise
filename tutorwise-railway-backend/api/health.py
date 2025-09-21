from fastapi import APIRouter, HTTPException
# Import from the new db_client file, fixing the circular dependency
from db_client import redis_client, neo4j_driver

router = APIRouter()

@router.get("/health", tags=["Health"])
async def health_check():
    """
    Checks the connection status of Redis and Neo4j.
    """
    redis_status = "error"
    neo4j_status = "error"

    # Test Redis
    try:
        if redis_client and redis_client.ping():
            redis_client.set("health_check:test", "ok")
            value = redis_client.get("health_check:test")
            if value == "ok":
                redis_status = "ok"
    except Exception as e:
        print(f"Health check Redis error: {e}")

    # Test Neo4j
    try:
        if neo4j_driver:
            with neo4j_driver.session() as session:
                result = session.run("RETURN 1")
                if result.single()[0] == 1:
                    neo4j_status = "ok"
    except Exception as e:
        print(f"Health check Neo4j error: {e}")

    if redis_status == "ok" and neo4j_status == "ok":
        return {"status": "ok", "redis": redis_status, "neo4j": neo4j_status}
    else:
        raise HTTPException(
            status_code=503,
            detail={"status": "error", "redis": redis_status, "neo4j": neo4j_status}
        )