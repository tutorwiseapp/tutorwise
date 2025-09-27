"""
Unit tests for database connection and configuration functions.
"""
import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
import redis
from neo4j import GraphDatabase

from app.db import (
    get_redis_config,
    get_neo4j_config,
    connect_redis,
    connect_neo4j,
    startup_database_connections,
    shutdown_database_connections,
    DatabaseError
)


class TestDatabaseConfiguration:
    """Test database configuration functions."""

    def test_get_redis_config_with_public_url(self, monkeypatch):
        """Test Redis config when public URL is available."""
        monkeypatch.setenv("REDIS_PUBLIC_URL", "redis://public:pass@host:6379")
        monkeypatch.setenv("REDIS_URL", "redis://private:pass@internal:6379")

        result = get_redis_config()
        assert result == "redis://public:pass@host:6379"

    def test_get_redis_config_with_railway_internal(self, monkeypatch):
        """Test Redis config with Railway internal URL."""
        monkeypatch.delenv("REDIS_PUBLIC_URL", raising=False)
        monkeypatch.setenv("REDIS_URL", "redis://default:password123@redis.railway.internal:6379")

        result = get_redis_config()
        expected = "redis://default:password123@shinkansen.proxy.rlwy.net:20154"
        assert result == expected

    def test_get_redis_config_with_regular_url(self, monkeypatch):
        """Test Redis config with regular URL."""
        monkeypatch.delenv("REDIS_PUBLIC_URL", raising=False)
        monkeypatch.setenv("REDIS_URL", "redis://localhost:6379")

        result = get_redis_config()
        assert result == "redis://localhost:6379"

    def test_get_redis_config_missing_config(self, monkeypatch):
        """Test Redis config when no URLs are provided."""
        monkeypatch.delenv("REDIS_PUBLIC_URL", raising=False)
        monkeypatch.delenv("REDIS_URL", raising=False)

        with pytest.raises(DatabaseError, match="Redis configuration missing"):
            get_redis_config()

    def test_get_neo4j_config_complete(self, monkeypatch):
        """Test Neo4j config with all required variables."""
        monkeypatch.setenv("NEO4J_URI", "bolt://localhost:7687")
        monkeypatch.setenv("NEO4J_USERNAME", "neo4j")
        monkeypatch.setenv("NEO4J_PASSWORD", "password")

        uri, username, password = get_neo4j_config()
        assert uri == "bolt://localhost:7687"
        assert username == "neo4j"
        assert password == "password"

    def test_get_neo4j_config_incomplete(self, monkeypatch):
        """Test Neo4j config with missing variables."""
        monkeypatch.setenv("NEO4J_URI", "bolt://localhost:7687")
        monkeypatch.delenv("NEO4J_USERNAME", raising=False)
        monkeypatch.delenv("NEO4J_PASSWORD", raising=False)

        with pytest.raises(DatabaseError, match="Neo4j configuration incomplete"):
            get_neo4j_config()


class TestRedisConnection:
    """Test Redis connection functions."""

    @pytest.mark.asyncio
    async def test_connect_redis_success(self, monkeypatch):
        """Test successful Redis connection."""
        monkeypatch.setenv("REDIS_URL", "redis://localhost:6379")

        mock_redis = MagicMock()
        mock_redis.ping.return_value = True

        with patch('redis.from_url', return_value=mock_redis) as mock_from_url:
            result = await connect_redis()

            assert result is mock_redis
            mock_from_url.assert_called_once()
            mock_redis.ping.assert_called_once()

    @pytest.mark.asyncio
    async def test_connect_redis_retry_success(self, monkeypatch):
        """Test Redis connection succeeds after retry."""
        monkeypatch.setenv("REDIS_URL", "redis://localhost:6379")

        mock_redis = MagicMock()
        # Fail first attempt, succeed second
        mock_redis.ping.side_effect = [Exception("Connection failed"), True]

        with patch('redis.from_url', return_value=mock_redis):
            with patch('asyncio.sleep', new_callable=AsyncMock):
                result = await connect_redis()

                assert result is mock_redis
                assert mock_redis.ping.call_count == 2

    @pytest.mark.asyncio
    async def test_connect_redis_max_retries_exceeded(self, monkeypatch):
        """Test Redis connection fails after max retries."""
        monkeypatch.setenv("REDIS_URL", "redis://localhost:6379")

        mock_redis = MagicMock()
        mock_redis.ping.side_effect = Exception("Connection failed")

        with patch('redis.from_url', return_value=mock_redis):
            with patch('asyncio.sleep', new_callable=AsyncMock):
                with pytest.raises(DatabaseError, match="Redis connection failed"):
                    await connect_redis(max_retries=2)

                assert mock_redis.ping.call_count == 2

    @pytest.mark.asyncio
    async def test_connect_redis_config_error(self, monkeypatch):
        """Test Redis connection with configuration error."""
        monkeypatch.delenv("REDIS_URL", raising=False)
        monkeypatch.delenv("REDIS_PUBLIC_URL", raising=False)

        with pytest.raises(DatabaseError, match="Redis configuration missing"):
            await connect_redis()


class TestNeo4jConnection:
    """Test Neo4j connection functions."""

    @pytest.mark.asyncio
    async def test_connect_neo4j_success(self, monkeypatch):
        """Test successful Neo4j connection."""
        monkeypatch.setenv("NEO4J_URI", "bolt://localhost:7687")
        monkeypatch.setenv("NEO4J_USERNAME", "neo4j")
        monkeypatch.setenv("NEO4J_PASSWORD", "password")

        mock_driver = MagicMock()
        mock_driver.verify_connectivity.return_value = None

        with patch('neo4j.GraphDatabase.driver', return_value=mock_driver) as mock_driver_create:
            result = await connect_neo4j()

            assert result is mock_driver
            mock_driver_create.assert_called_once_with(
                "bolt://localhost:7687",
                auth=("neo4j", "password")
            )
            mock_driver.verify_connectivity.assert_called_once()

    @pytest.mark.asyncio
    async def test_connect_neo4j_retry_success(self, monkeypatch):
        """Test Neo4j connection succeeds after retry."""
        monkeypatch.setenv("NEO4J_URI", "bolt://localhost:7687")
        monkeypatch.setenv("NEO4J_USERNAME", "neo4j")
        monkeypatch.setenv("NEO4J_PASSWORD", "password")

        mock_driver = MagicMock()
        # Fail first attempt, succeed second
        mock_driver.verify_connectivity.side_effect = [Exception("Connection failed"), None]

        with patch('neo4j.GraphDatabase.driver', return_value=mock_driver):
            with patch('asyncio.sleep', new_callable=AsyncMock):
                result = await connect_neo4j()

                assert result is mock_driver
                assert mock_driver.verify_connectivity.call_count == 2

    @pytest.mark.asyncio
    async def test_connect_neo4j_max_retries_exceeded(self, monkeypatch):
        """Test Neo4j connection fails after max retries."""
        monkeypatch.setenv("NEO4J_URI", "bolt://localhost:7687")
        monkeypatch.setenv("NEO4J_USERNAME", "neo4j")
        monkeypatch.setenv("NEO4J_PASSWORD", "password")

        mock_driver = MagicMock()
        mock_driver.verify_connectivity.side_effect = Exception("Connection failed")

        with patch('neo4j.GraphDatabase.driver', return_value=mock_driver):
            with patch('asyncio.sleep', new_callable=AsyncMock):
                with pytest.raises(DatabaseError, match="Neo4j connection failed"):
                    await connect_neo4j(max_retries=2)

                assert mock_driver.verify_connectivity.call_count == 2


class TestDatabaseLifecycle:
    """Test database startup and shutdown functions."""

    @pytest.mark.asyncio
    async def test_startup_database_connections_success(self):
        """Test successful database startup."""
        with patch('app.db.connect_redis', new_callable=AsyncMock) as mock_redis:
            with patch('app.db.connect_neo4j', new_callable=AsyncMock) as mock_neo4j:
                mock_redis.return_value = MagicMock()
                mock_neo4j.return_value = MagicMock()

                await startup_database_connections()

                mock_redis.assert_called_once()
                mock_neo4j.assert_called_once()

    @pytest.mark.asyncio
    async def test_startup_database_connections_redis_failure(self):
        """Test database startup with Redis failure."""
        with patch('app.db.connect_redis', new_callable=AsyncMock) as mock_redis:
            with patch('app.db.connect_neo4j', new_callable=AsyncMock) as mock_neo4j:
                mock_redis.side_effect = DatabaseError("Redis failed")
                mock_neo4j.return_value = MagicMock()

                # Should not raise exception, just log error
                await startup_database_connections()

                mock_redis.assert_called_once()
                mock_neo4j.assert_called_once()

    @pytest.mark.asyncio
    async def test_shutdown_database_connections(self):
        """Test database shutdown."""
        mock_redis = MagicMock()
        mock_redis.aclose = AsyncMock()
        mock_neo4j = MagicMock()

        with patch('app.db.redis_client', mock_redis):
            with patch('app.db.neo4j_driver', mock_neo4j):
                await shutdown_database_connections()

                mock_redis.aclose.assert_called_once()
                mock_neo4j.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_shutdown_database_connections_with_errors(self):
        """Test database shutdown with errors."""
        mock_redis = MagicMock()
        mock_redis.aclose = AsyncMock(side_effect=Exception("Redis close failed"))
        mock_neo4j = MagicMock()
        mock_neo4j.close.side_effect = Exception("Neo4j close failed")

        with patch('app.db.redis_client', mock_redis):
            with patch('app.db.neo4j_driver', mock_neo4j):
                # Should not raise exception, just log errors
                await shutdown_database_connections()

                mock_redis.aclose.assert_called_once()
                mock_neo4j.close.assert_called_once()