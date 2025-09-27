"""
Integration tests for the health check endpoint.
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


class TestHealthEndpoint:
    """Test health check endpoint functionality."""

    def test_health_endpoint_all_services_healthy(self, test_client):
        """Test health endpoint when all services are healthy."""
        mock_redis = MagicMock()
        mock_redis.ping.return_value = True

        mock_neo4j = MagicMock()
        mock_neo4j.verify_connectivity.return_value = None

        with patch('app.api.health.redis_client', mock_redis):
            with patch('app.api.health.neo4j_driver', mock_neo4j):
                response = test_client.get("/health")

                assert response.status_code == 200
                data = response.json()

                assert data["status"] == "ok"
                assert "timestamp" in data
                assert "services" in data
                assert data["services"]["redis"]["status"] == "ok"
                assert data["services"]["neo4j"]["status"] == "ok"

    def test_health_endpoint_redis_not_configured(self, test_client):
        """Test health endpoint when Redis is not configured."""
        mock_neo4j = MagicMock()
        mock_neo4j.verify_connectivity.return_value = None

        with patch('app.api.health.redis_client', None):
            with patch('app.api.health.neo4j_driver', mock_neo4j):
                response = test_client.get("/health")

                assert response.status_code == 200
                data = response.json()

                assert data["status"] == "degraded"
                assert data["services"]["redis"]["status"] == "not_configured"
                assert data["services"]["redis"]["message"] == "Redis client not initialized"
                assert data["services"]["neo4j"]["status"] == "ok"

    def test_health_endpoint_neo4j_not_configured(self, test_client):
        """Test health endpoint when Neo4j is not configured."""
        mock_redis = MagicMock()
        mock_redis.ping.return_value = True

        with patch('app.api.health.redis_client', mock_redis):
            with patch('app.api.health.neo4j_driver', None):
                response = test_client.get("/health")

                assert response.status_code == 200
                data = response.json()

                assert data["status"] == "degraded"
                assert data["services"]["redis"]["status"] == "ok"
                assert data["services"]["neo4j"]["status"] == "not_configured"
                assert data["services"]["neo4j"]["message"] == "Neo4j driver not initialized"

    def test_health_endpoint_redis_connection_error(self, test_client):
        """Test health endpoint when Redis connection fails."""
        mock_redis = MagicMock()
        mock_redis.ping.side_effect = Exception("Connection refused")

        mock_neo4j = MagicMock()
        mock_neo4j.verify_connectivity.return_value = None

        with patch('app.api.health.redis_client', mock_redis):
            with patch('app.api.health.neo4j_driver', mock_neo4j):
                response = test_client.get("/health")

                assert response.status_code == 200
                data = response.json()

                assert data["status"] == "degraded"
                assert data["services"]["redis"]["status"] == "error"
                assert data["services"]["redis"]["message"] == "Redis connection failed"
                assert "Connection refused" in data["services"]["redis"]["details"]
                assert data["services"]["neo4j"]["status"] == "ok"

    def test_health_endpoint_neo4j_connection_error(self, test_client):
        """Test health endpoint when Neo4j connection fails."""
        mock_redis = MagicMock()
        mock_redis.ping.return_value = True

        mock_neo4j = MagicMock()
        mock_neo4j.verify_connectivity.side_effect = Exception("Database unavailable")

        with patch('app.api.health.redis_client', mock_redis):
            with patch('app.api.health.neo4j_driver', mock_neo4j):
                response = test_client.get("/health")

                assert response.status_code == 200
                data = response.json()

                assert data["status"] == "degraded"
                assert data["services"]["redis"]["status"] == "ok"
                assert data["services"]["neo4j"]["status"] == "error"
                assert data["services"]["neo4j"]["message"] == "Neo4j connection failed"
                assert "Database unavailable" in data["services"]["neo4j"]["details"]

    def test_health_endpoint_all_services_down(self, test_client):
        """Test health endpoint when all services are down."""
        mock_redis = MagicMock()
        mock_redis.ping.side_effect = Exception("Redis down")

        mock_neo4j = MagicMock()
        mock_neo4j.verify_connectivity.side_effect = Exception("Neo4j down")

        with patch('app.api.health.redis_client', mock_redis):
            with patch('app.api.health.neo4j_driver', mock_neo4j):
                response = test_client.get("/health")

                assert response.status_code == 200
                data = response.json()

                assert data["status"] == "degraded"
                assert data["services"]["redis"]["status"] == "error"
                assert data["services"]["neo4j"]["status"] == "error"

    @pytest.mark.asyncio
    async def test_health_endpoint_async_client(self, async_test_client):
        """Test health endpoint with async client."""
        mock_redis = MagicMock()
        mock_redis.ping.return_value = True

        mock_neo4j = MagicMock()
        mock_neo4j.verify_connectivity.return_value = None

        with patch('app.api.health.redis_client', mock_redis):
            with patch('app.api.health.neo4j_driver', mock_neo4j):
                response = await async_test_client.get("/health")

                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "ok"

    def test_health_endpoint_redis_retry_logic(self, test_client):
        """Test health endpoint Redis retry logic."""
        mock_redis = MagicMock()
        # Fail twice, then succeed
        mock_redis.ping.side_effect = [
            Exception("Temp failure 1"),
            Exception("Temp failure 2"),
            True
        ]

        mock_neo4j = MagicMock()
        mock_neo4j.verify_connectivity.return_value = None

        with patch('app.api.health.redis_client', mock_redis):
            with patch('app.api.health.neo4j_driver', mock_neo4j):
                with patch('asyncio.sleep'):  # Mock sleep to speed up test
                    response = test_client.get("/health")

                    assert response.status_code == 200
                    data = response.json()

                    assert data["status"] == "ok"
                    assert data["services"]["redis"]["status"] == "ok"
                    assert mock_redis.ping.call_count == 3

    def test_health_endpoint_response_format(self, test_client):
        """Test health endpoint response format."""
        mock_redis = MagicMock()
        mock_redis.ping.return_value = True

        mock_neo4j = MagicMock()
        mock_neo4j.verify_connectivity.return_value = None

        with patch('app.api.health.redis_client', mock_redis):
            with patch('app.api.health.neo4j_driver', mock_neo4j):
                response = test_client.get("/health")

                assert response.status_code == 200
                data = response.json()

                # Check required top-level fields
                required_fields = ["status", "timestamp", "services"]
                for field in required_fields:
                    assert field in data

                # Check services structure
                assert "redis" in data["services"]
                assert "neo4j" in data["services"]

                # Check service fields
                for service in ["redis", "neo4j"]:
                    service_data = data["services"][service]
                    assert "status" in service_data
                    assert "message" in service_data
                    assert "details" in service_data

    def test_health_endpoint_content_type(self, test_client):
        """Test health endpoint returns correct content type."""
        with patch('app.api.health.redis_client', MagicMock()):
            with patch('app.api.health.neo4j_driver', MagicMock()):
                response = test_client.get("/health")

                assert response.status_code == 200
                assert response.headers["content-type"] == "application/json"


class TestDevRoutes:
    """Test development routes."""

    def test_test_neo4j_write_success(self, test_client):
        """Test successful Neo4j write operation."""
        mock_driver = MagicMock()
        mock_session = MagicMock()
        mock_driver.session.return_value.__enter__.return_value = mock_session
        mock_driver.session.return_value.__exit__.return_value = None

        with patch('app.api.dev_routes.neo4j_driver', mock_driver):
            response = test_client.post("/test-neo4j-write")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ok"
            assert "Successfully wrote test node" in data["message"]
            mock_session.write_transaction.assert_called_once()

    def test_test_neo4j_write_driver_not_available(self, test_client):
        """Test Neo4j write when driver is not available."""
        with patch('app.api.dev_routes.neo4j_driver', None):
            response = test_client.post("/test-neo4j-write")

            assert response.status_code == 503
            data = response.json()
            assert "Neo4j driver not available" in data["detail"]

    def test_test_neo4j_write_database_error(self, test_client):
        """Test Neo4j write with database error."""
        mock_driver = MagicMock()
        mock_session = MagicMock()
        mock_session.write_transaction.side_effect = Exception("Database error")
        mock_driver.session.return_value.__enter__.return_value = mock_session
        mock_driver.session.return_value.__exit__.return_value = None

        with patch('app.api.dev_routes.neo4j_driver', mock_driver):
            response = test_client.post("/test-neo4j-write")

            assert response.status_code == 500
            data = response.json()
            assert "Failed to write to Neo4j" in data["detail"]
            assert "Database error" in data["detail"]