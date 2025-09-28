"""
Testing utilities for FastAPI application.
"""
import json
import asyncio
from typing import Dict, Any, Optional, List
from unittest.mock import MagicMock, AsyncMock
from fastapi.testclient import TestClient
from httpx import AsyncClient


class APITestUtils:
    """Utilities for API testing."""

    @staticmethod
    def assert_successful_response(response, expected_status: int = 200):
        """Assert response is successful with expected status."""
        assert response.status_code == expected_status
        assert response.headers["content-type"] == "application/json"
        return response.json()

    @staticmethod
    def assert_error_response(response, expected_status: int, expected_message: str = None):
        """Assert response is an error with expected status and message."""
        assert response.status_code == expected_status
        data = response.json()
        assert "detail" in data
        if expected_message:
            assert expected_message in data["detail"]
        return data

    @staticmethod
    def create_auth_headers(token: str = "fake_jwt_token") -> Dict[str, str]:
        """Create authorization headers."""
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    @staticmethod
    def create_mock_user(
        user_id: str = "user_123",
        email: str = "test@example.com",
        role: str = "student"
    ) -> Dict[str, Any]:
        """Create mock user data."""
        return {
            "id": user_id,
            "email": email,
            "username": email.split("@")[0],
            "full_name": f"Test {role.title()}",
            "role": role,
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z"
        }

    @staticmethod
    def create_mock_lesson(
        lesson_id: str = "lesson_123",
        tutor_id: str = "tutor_456",
        student_id: str = "user_123"
    ) -> Dict[str, Any]:
        """Create mock lesson data."""
        return {
            "id": lesson_id,
            "tutor_id": tutor_id,
            "student_id": student_id,
            "subject": "mathematics",
            "title": "Algebra Basics",
            "description": "Introduction to algebraic concepts",
            "scheduled_time": "2024-01-15T10:00:00Z",
            "duration_minutes": 60,
            "status": "scheduled",
            "price": 50.0
        }


class DatabaseTestUtils:
    """Utilities for database testing."""

    @staticmethod
    def create_mock_redis_client():
        """Create a mock Redis client."""
        mock_redis = MagicMock()
        mock_redis.ping.return_value = True
        mock_redis.get.return_value = None
        mock_redis.set.return_value = True
        mock_redis.delete.return_value = 1
        mock_redis.exists.return_value = False
        mock_redis.hget.return_value = None
        mock_redis.hset.return_value = True
        mock_redis.expire.return_value = True
        return mock_redis

    @staticmethod
    def create_mock_neo4j_driver():
        """Create a mock Neo4j driver."""
        mock_driver = MagicMock()
        mock_session = MagicMock()
        mock_driver.session.return_value.__enter__.return_value = mock_session
        mock_driver.session.return_value.__exit__.return_value = None
        mock_driver.verify_connectivity.return_value = None
        return mock_driver, mock_session

    @staticmethod
    def create_mock_neo4j_result(records: List[Dict[str, Any]] = None):
        """Create a mock Neo4j result."""
        if records is None:
            records = []

        mock_result = MagicMock()
        mock_result.data.return_value = records
        mock_result.__iter__.return_value = iter(records)
        return mock_result


class AsyncTestUtils:
    """Utilities for async testing."""

    @staticmethod
    async def assert_async_response(
        client: AsyncClient,
        method: str,
        url: str,
        expected_status: int = 200,
        headers: Dict[str, str] = None,
        json_data: Dict[str, Any] = None
    ):
        """Assert async response is successful."""
        kwargs = {}
        if headers:
            kwargs["headers"] = headers
        if json_data:
            kwargs["json"] = json_data

        if method.upper() == "GET":
            response = await client.get(url, **kwargs)
        elif method.upper() == "POST":
            response = await client.post(url, **kwargs)
        elif method.upper() == "PUT":
            response = await client.put(url, **kwargs)
        elif method.upper() == "DELETE":
            response = await client.delete(url, **kwargs)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")

        assert response.status_code == expected_status
        return response.json() if response.headers.get("content-type") == "application/json" else response

    @staticmethod
    def run_async_test(coro):
        """Run async test in sync context."""
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()


class PaymentTestUtils:
    """Utilities for payment testing."""

    @staticmethod
    def create_mock_stripe_payment_intent(
        payment_intent_id: str = "pi_test_123",
        amount: int = 5000,  # $50.00
        status: str = "succeeded"
    ) -> Dict[str, Any]:
        """Create mock Stripe payment intent."""
        return {
            "id": payment_intent_id,
            "object": "payment_intent",
            "amount": amount,
            "currency": "usd",
            "status": status,
            "client_secret": f"{payment_intent_id}_secret_test",
            "metadata": {
                "lesson_id": "lesson_123",
                "student_id": "user_123",
                "tutor_id": "tutor_456"
            }
        }

    @staticmethod
    def create_mock_stripe_customer(
        customer_id: str = "cus_test_123",
        email: str = "test@example.com"
    ) -> Dict[str, Any]:
        """Create mock Stripe customer."""
        return {
            "id": customer_id,
            "object": "customer",
            "email": email,
            "metadata": {
                "user_id": "user_123"
            }
        }


class AuthTestUtils:
    """Utilities for authentication testing."""

    @staticmethod
    def create_mock_jwt_payload(
        user_id: str = "user_123",
        email: str = "test@example.com",
        role: str = "student"
    ) -> Dict[str, Any]:
        """Create mock JWT payload."""
        return {
            "sub": user_id,
            "email": email,
            "role": role,
            "exp": 1640995200,  # Future timestamp
            "iat": 1640908800   # Past timestamp
        }

    @staticmethod
    def create_invalid_token_scenarios() -> List[Dict[str, Any]]:
        """Create various invalid token scenarios for testing."""
        return [
            {"token": "", "description": "empty token"},
            {"token": "invalid", "description": "malformed token"},
            {"token": "Bearer", "description": "missing token after Bearer"},
            {"token": "expired_jwt_token", "description": "expired token"},
            {"token": "malformed.jwt.token", "description": "invalid JWT format"}
        ]


# Test data factories
class TestDataFactory:
    """Factory for creating test data."""

    @staticmethod
    def user_data(role: str = "student", **kwargs) -> Dict[str, Any]:
        """Create user test data."""
        defaults = {
            "id": f"{role}_123",
            "email": f"test_{role}@example.com",
            "username": f"test_{role}",
            "full_name": f"Test {role.title()}",
            "role": role,
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z"
        }
        defaults.update(kwargs)
        return defaults

    @staticmethod
    def lesson_data(**kwargs) -> Dict[str, Any]:
        """Create lesson test data."""
        defaults = {
            "id": "lesson_123",
            "tutor_id": "tutor_456",
            "student_id": "user_123",
            "subject": "mathematics",
            "title": "Test Lesson",
            "description": "A test lesson",
            "scheduled_time": "2024-01-15T10:00:00Z",
            "duration_minutes": 60,
            "status": "scheduled",
            "price": 50.0
        }
        defaults.update(kwargs)
        return defaults

    @staticmethod
    def payment_data(**kwargs) -> Dict[str, Any]:
        """Create payment test data."""
        defaults = {
            "id": "payment_123",
            "lesson_id": "lesson_123",
            "student_id": "user_123",
            "amount": 50.0,
            "currency": "usd",
            "status": "completed",
            "stripe_payment_intent_id": "pi_test_123",
            "created_at": "2024-01-01T00:00:00Z"
        }
        defaults.update(kwargs)
        return defaults