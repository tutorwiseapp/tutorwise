# app/api/dev_routes.py
import datetime

from fastapi import APIRouter, HTTPException

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
    # Use global driver if available, otherwise create a temporary one
    driver_to_use = neo4j_driver

    if not driver_to_use:
        try:
            # Create a temporary driver for this request
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
            raise HTTPException(
                status_code=503,
                detail=f"Neo4j configuration unavailable: {str(e)}"
            )

    try:
        with driver_to_use.session() as session:
            session.write_transaction(_create_test_node)
        return {"status": "ok", "message": "Successfully wrote test node to Neo4j."}
    except Exception as e:
        print(f"Neo4j write error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write to Neo4j. DB Error: {str(e)}"
        )
