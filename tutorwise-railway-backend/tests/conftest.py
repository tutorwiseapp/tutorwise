"""
Test configuration and fixtures for the Tutorwise backend.
"""
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock
import os
from httpx import AsyncClient
from fastapi.testclient import TestClient

# Set test environment
os.environ["ENV"] = "test"

from app.main import app
from app.db import redis_client, neo4j_driver


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_client() -> TestClient:
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
async def async_test_client() -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client for the FastAPI app."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_redis():
    """Mock Redis client for testing."""
    mock = MagicMock()
    mock.ping.return_value = True
    mock.get.return_value = None
    mock.set.return_value = True
    mock.delete.return_value = 1
    mock.exists.return_value = False
    return mock


@pytest.fixture
def mock_neo4j_driver():
    """Mock Neo4j driver for testing."""
    mock_driver = MagicMock()
    mock_session = MagicMock()
    mock_driver.session.return_value.__enter__.return_value = mock_session
    mock_driver.session.return_value.__exit__.return_value = None
    mock_driver.verify_connectivity.return_value = None
    return mock_driver


@pytest.fixture
def mock_neo4j_session():
    """Mock Neo4j session for testing."""
    mock_session = MagicMock()
    mock_result = MagicMock()
    mock_session.run.return_value = mock_result
    mock_session.write_transaction.return_value = None
    mock_session.read_transaction.return_value = None
    return mock_session


@pytest.fixture(autouse=True)
def setup_test_environment(monkeypatch):
    """Set up test environment variables."""
    monkeypatch.setenv("ENV", "test")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/1")  # Test DB
    monkeypatch.setenv("NEO4J_URI", "bolt://localhost:7687")
    monkeypatch.setenv("NEO4J_USERNAME", "test_user")
    monkeypatch.setenv("NEO4J_PASSWORD", "test_password")
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:3000")


@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "id": "user_123",
        "email": "test@example.com",
        "username": "testuser",
        "full_name": "Test User",
        "role": "student",
        "is_active": True,
        "created_at": "2024-01-01T00:00:00Z"
    }


@pytest.fixture
def sample_tutor_data():
    """Sample tutor data for testing."""
    return {
        "id": "tutor_456",
        "email": "tutor@example.com",
        "username": "testtutor",
        "full_name": "Test Tutor",
        "role": "tutor",
        "is_active": True,
        "subjects": ["math", "physics"],
        "hourly_rate": 50.0,
        "created_at": "2024-01-01T00:00:00Z"
    }


@pytest.fixture
def sample_lesson_data():
    """Sample lesson data for testing."""
    return {
        "id": "lesson_789",
        "tutor_id": "tutor_456",
        "student_id": "user_123",
        "subject": "math",
        "scheduled_time": "2024-01-15T10:00:00Z",
        "duration_minutes": 60,
        "status": "scheduled",
        "price": 50.0
    }


class MockDatabase:
    """Mock database for testing."""

    def __init__(self):
        self.users = {}
        self.sessions = {}
        self.lessons = {}

    def reset(self):
        """Reset all data."""
        self.users.clear()
        self.sessions.clear()
        self.lessons.clear()


@pytest.fixture
def mock_database():
    """Provide a mock database instance."""
    db = MockDatabase()
    yield db
    db.reset()


@pytest.fixture
def auth_headers():
    """Sample auth headers for testing."""
    return {
        "Authorization": "Bearer fake_jwt_token",
        "Content-Type": "application/json"
    }


@pytest.fixture
def invalid_auth_headers():
    """Invalid auth headers for testing."""
    return {
        "Authorization": "Bearer invalid_token",
        "Content-Type": "application/json"
    }