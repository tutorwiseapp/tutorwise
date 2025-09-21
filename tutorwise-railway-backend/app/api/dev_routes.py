from fastapi import APIRouter, HTTPException
from ..main import neo4j_driver
import datetime

router = APIRouter()

def _create_test_node(tx):
    """
    A helper function to create a simple test node in Neo4j.
    Deletes any previous test nodes to keep the database clean.
    """
    # First, delete any old test nodes to ensure a clean test run
    tx.run("MATCH (n:SystemTestNode) DETACH DELETE n")
    
    # Then, create a new node with a timestamp to confirm the write
    timestamp = datetime.datetime.now().isoformat()
    tx.run(
        "CREATE (n:SystemTestNode { source: $source, timestamp: $timestamp })",
        source="Railway Backend",
        timestamp=timestamp
    )

@router.post("/test-neo4j-write", tags=["Development"])
async def test_neo4j_write():
    """
    Receives the request from the Vercel frontend and performs a test write 
    to the Neo4j database to verify connectivity and credentials.
    """
    if not neo4j_driver:
        raise HTTPException(
            status_code=503,
            detail="Neo4j driver not available. Check backend startup logs."
        )

    try:
        # Use a session from the driver to execute the transaction
        with neo4j_driver.session() as session:
            session.write_transaction(_create_test_node)
        
        return {"status": "ok", "message": "Successfully wrote test node to Neo4j."}
    except Exception as e:
        # If an error occurs, print it to the Railway logs and return a specific error
        print(f"Neo4j write error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write to Neo4j. DB Error: {str(e)}"
        )