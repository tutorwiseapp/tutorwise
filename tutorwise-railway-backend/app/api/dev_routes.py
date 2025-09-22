from fastapi import APIRouter, HTTPException
import datetime
# Import from the new db.py file
from app.db import neo4j_driver

router = APIRouter()

def _create_test_node(tx):
    tx.run("MATCH (n:SystemTestNode) DETACH DELETE n")
    timestamp = datetime.datetime.now().isoformat()
    tx.run(
        "CREATE (n:SystemTestNode { source: $source, timestamp: $timestamp })",
        source="Railway Backend",
        timestamp=timestamp
    )

@router.post("/test-neo4j-write", tags=["Development"])
async def test_neo4j_write():
    if not neo4j_driver:
        raise HTTPException(
            status_code=503,
            detail="Neo4j driver not available. Check backend startup logs."
        )
    try:
        with neo4j_driver.session() as session:
            session.write_transaction(_create_test_node)
        return {"status": "ok", "message": "Successfully wrote test node to Neo4j."}
    except Exception as e:
        print(f"Neo4j write error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write to Neo4j. DB Error: {str(e)}"
        )