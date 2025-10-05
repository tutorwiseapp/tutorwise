"""
Account API endpoints for TutorWise
Handles user account settings and professional info (templates)
"""
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
import os
from supabase import create_client, Client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/account", tags=["account"])

# Supabase client setup
def get_supabase() -> Client:
    """Get Supabase client"""
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        raise HTTPException(
            status_code=500,
            detail="Supabase configuration missing"
        )

    return create_client(supabase_url, supabase_key)

# Request/Response Models
class ProfessionalInfoResponse(BaseModel):
    id: str
    profile_id: str
    role_type: str
    subjects: Optional[list[str]] = None
    teaching_experience: Optional[str] = None
    hourly_rate: Optional[float] = None
    qualifications: Optional[list[str]] = None
    teaching_methods: Optional[list[str]] = None
    availability: Optional[Dict[str, Any]] = None
    specializations: Optional[list[str]] = None
    created_at: str
    updated_at: str

class UpdateProfessionalInfoRequest(BaseModel):
    role_type: str  # 'seeker', 'provider', or 'agent'
    subjects: Optional[list[str]] = None
    teaching_experience: Optional[str] = None
    hourly_rate: Optional[float] = None
    qualifications: Optional[list[str]] = None
    teaching_methods: Optional[list[str]] = None
    availability: Optional[Dict[str, Any]] = None
    specializations: Optional[list[str]] = None

# Helper function to verify JWT token
async def verify_token(authorization: Optional[str] = Header(None)) -> str:
    """Verify JWT token and return user ID"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.replace("Bearer ", "")

    # In production, verify the JWT token with Supabase
    # For now, we'll extract the user ID from the token
    # This is a simplified version - in production use proper JWT verification
    supabase = get_supabase()

    try:
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user.id
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/professional-info", response_model=ProfessionalInfoResponse)
async def get_professional_info(
    role_type: str,
    user_id: str = Depends(verify_token),
    supabase: Client = Depends(get_supabase)
):
    """
    Get professional info (template) for a specific role

    Query params:
    - role_type: 'seeker', 'provider', or 'agent'
    """
    try:
        # Fetch role_details for the user and role
        response = (supabase.table("role_details")
            .select("*")
            .eq("profile_id", user_id)
            .eq("role_type", role_type)
            .execute())

        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No professional info found for role: {role_type}"
            )

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching professional info: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch professional info: {str(e)}"
        )

@router.patch("/professional-info")
async def update_professional_info(
    data: UpdateProfessionalInfoRequest,
    user_id: str = Depends(verify_token),
    supabase: Client = Depends(get_supabase)
):
    """
    Update professional info (template) for a specific role

    This updates the role_details table which serves as an editable template
    for creating listings. Changes here do NOT affect existing listings.
    """
    try:
        # Prepare update data
        update_data = {
            "profile_id": user_id,
            "role_type": data.role_type,
            "updated_at": "now()"
        }

        # Add optional fields if provided
        if data.subjects is not None:
            update_data["subjects"] = data.subjects
        if data.teaching_experience is not None:
            update_data["teaching_experience"] = data.teaching_experience
        if data.hourly_rate is not None:
            update_data["hourly_rate"] = data.hourly_rate
        if data.qualifications is not None:
            update_data["qualifications"] = data.qualifications
        if data.teaching_methods is not None:
            update_data["teaching_methods"] = data.teaching_methods
        if data.availability is not None:
            update_data["availability"] = data.availability
        if data.specializations is not None:
            update_data["specializations"] = data.specializations

        # Upsert (update or insert) the template
        response = (supabase.table("role_details")
            .upsert(update_data, on_conflict="profile_id,role_type")
            .execute())

        if not response.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to update professional info"
            )

        return {
            "success": True,
            "message": "✅ Template saved. Changes won't affect your existing listings.",
            "data": response.data[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating professional info: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update professional info: {str(e)}"
        )
