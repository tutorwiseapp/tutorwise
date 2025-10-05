"""
Unit tests for account API endpoints
Tests professional info template management
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi import HTTPException
from app.api.account import (
    get_professional_info,
    update_professional_info,
    UpdateProfessionalInfoRequest,
    verify_token
)


class TestVerifyToken:
    """Test JWT token verification"""

    @pytest.mark.asyncio
    async def test_missing_authorization_header(self):
        """Should raise 401 when authorization header is missing"""
        with pytest.raises(HTTPException) as exc_info:
            await verify_token(None)
        assert exc_info.value.status_code == 401
        assert "Missing or invalid" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_invalid_authorization_format(self):
        """Should raise 401 when authorization header format is invalid"""
        with pytest.raises(HTTPException) as exc_info:
            await verify_token("InvalidFormat")
        assert exc_info.value.status_code == 401


class TestGetProfessionalInfo:
    """Test GET /api/account/professional-info endpoint"""

    @pytest.mark.asyncio
    async def test_get_professional_info_success(self):
        """Should return professional info when found"""
        # Mock Supabase client
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [{
            'id': 'test-id',
            'profile_id': 'user-123',
            'role_type': 'provider',
            'subjects': ['Mathematics', 'Physics'],
            'teaching_experience': '5-10 years',
            'hourly_rate': 45.0,
            'created_at': '2025-10-05T00:00:00Z',
            'updated_at': '2025-10-05T00:00:00Z'
        }]

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_response

        # Call function
        result = await get_professional_info(
            role_type='provider',
            user_id='user-123',
            supabase=mock_supabase
        )

        assert result['role_type'] == 'provider'
        assert result['subjects'] == ['Mathematics', 'Physics']
        assert result['hourly_rate'] == 45.0

    @pytest.mark.asyncio
    async def test_get_professional_info_not_found(self):
        """Should raise 404 when professional info not found"""
        # Mock Supabase client
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = []

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_response

        # Should raise 404
        with pytest.raises(HTTPException) as exc_info:
            await get_professional_info(
                role_type='provider',
                user_id='user-123',
                supabase=mock_supabase
            )

        assert exc_info.value.status_code == 404
        assert "No professional info found" in exc_info.value.detail


class TestUpdateProfessionalInfo:
    """Test PATCH /api/account/professional-info endpoint"""

    @pytest.mark.asyncio
    async def test_update_professional_info_success(self):
        """Should successfully update professional info"""
        # Mock request data
        request_data = UpdateProfessionalInfoRequest(
            role_type='provider',
            subjects=['Mathematics', 'Physics'],
            teaching_experience='5-10 years',
            hourly_rate=45.0,
            qualifications=['BSc Mathematics - Oxford'],
            teaching_methods=['Interactive', 'Exam-focused']
        )

        # Mock Supabase client
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [{
            'id': 'test-id',
            'profile_id': 'user-123',
            'role_type': 'provider',
            'subjects': ['Mathematics', 'Physics'],
            'teaching_experience': '5-10 years',
            'hourly_rate': 45.0,
            'qualifications': ['BSc Mathematics - Oxford'],
            'teaching_methods': ['Interactive', 'Exam-focused'],
            'created_at': '2025-10-05T00:00:00Z',
            'updated_at': '2025-10-05T00:00:00Z'
        }]

        mock_supabase.table.return_value.upsert.return_value.execute.return_value = mock_response

        # Call function
        result = await update_professional_info(
            data=request_data,
            user_id='user-123',
            supabase=mock_supabase
        )

        assert result['success'] is True
        assert "Template saved" in result['message']
        assert result['data']['role_type'] == 'provider'

    @pytest.mark.asyncio
    async def test_update_professional_info_minimal_data(self):
        """Should successfully update with minimal required data"""
        # Mock request data with only required fields
        request_data = UpdateProfessionalInfoRequest(
            role_type='provider',
            subjects=['Mathematics']
        )

        # Mock Supabase client
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [{
            'id': 'test-id',
            'profile_id': 'user-123',
            'role_type': 'provider',
            'subjects': ['Mathematics'],
            'created_at': '2025-10-05T00:00:00Z',
            'updated_at': '2025-10-05T00:00:00Z'
        }]

        mock_supabase.table.return_value.upsert.return_value.execute.return_value = mock_response

        # Call function
        result = await update_professional_info(
            data=request_data,
            user_id='user-123',
            supabase=mock_supabase
        )

        assert result['success'] is True
        assert result['data']['subjects'] == ['Mathematics']

    @pytest.mark.asyncio
    async def test_update_professional_info_database_error(self):
        """Should raise 500 when database update fails"""
        # Mock request data
        request_data = UpdateProfessionalInfoRequest(
            role_type='provider',
            subjects=['Mathematics']
        )

        # Mock Supabase client with error
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = None

        mock_supabase.table.return_value.upsert.return_value.execute.return_value = mock_response

        # Should raise 500
        with pytest.raises(HTTPException) as exc_info:
            await update_professional_info(
                data=request_data,
                user_id='user-123',
                supabase=mock_supabase
            )

        assert exc_info.value.status_code == 500
        assert "Failed to update" in exc_info.value.detail
