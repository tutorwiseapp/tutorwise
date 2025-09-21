from fastapi import APIRouter, HTTPException
from neo4j import exceptions
from ..main import neo4j_driver

router = APIRouter()

@router.post("/test-neo4j-write", tags=["Development"])
async def test_neo4j_write():
    """
    A simple endpoint to create a test node in Neo4j.
    This should only be used for development and testing.
    """
    try:
        if not neo4j_driver:
            raise HTTPException(status_code=500, detail="Neo4j driver not available")
            
        with neo4j_driver.session() as session:
            session.run("CREATE (:SystemTest {name: 'Vercel->Railway', timestamp: timestamp()})")
        return {"status": "ok", "message": "Test node created in Neo4j"}
    except exceptions.ServiceUnavailable as e:
         raise HTTPException(status_code=503, detail=f"Neo4j is unavailable: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred with Neo4j: {e}")
