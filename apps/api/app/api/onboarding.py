"""
Onboarding API endpoints for saving and retrieving user onboarding progress.
Supports auto-save functionality during onboarding wizard.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime
from app.auth import verify_token
from app.database import get_supabase
from supabase import Client

router = APIRouter()


# Request/Response Models
class OnboardingProgressRequest(BaseModel):
    """Request model for saving onboarding progress"""
    step: int = Field(..., ge=1, le=5, description="Current onboarding step (1-5)")
    role_type: str = Field(..., pattern="^(tutor|client|agent)$", description="User role type")
    data: Dict[str, Any] = Field(default_factory=dict, description="Step-specific data")
    is_complete: bool = Field(default=False, description="Whether onboarding is complete")


class OnboardingProgressResponse(BaseModel):
    """Response model for onboarding progress operations"""
    success: bool
    message: str
    progress_id: Optional[str] = None
    updated_at: Optional[str] = None
    current_step: Optional[int] = None
    step_data: Optional[Dict[str, Any]] = None


@router.post("/save-progress", response_model=OnboardingProgressResponse)
async def save_onboarding_progress(
    request: OnboardingProgressRequest,
    user_id: str = Depends(verify_token),
    supabase: Client = Depends(get_supabase)
):
    """
    Save user's onboarding progress with auto-save support.

    This endpoint allows incremental progress saving as the user completes
    onboarding steps. It uses upsert to handle both new and existing progress.

    Args:
        request: Onboarding progress data
        user_id: Authenticated user ID from JWT token
        supabase: Supabase client instance

    Returns:
        OnboardingProgressResponse with success status and progress details

    Raises:
        HTTPException: If save operation fails
    """
    try:
        # Prepare progress data for upsert
        progress_data = {
            "profile_id": user_id,
            "role_type": request.role_type,
            "current_step": request.step,
            "step_data": request.data,
            "is_complete": request.is_complete,
            "updated_at": datetime.utcnow().isoformat()
        }

        # Upsert onboarding_progress table
        # on_conflict ensures we update existing progress for this profile_id + role_type
        response = (supabase.table("onboarding_progress")
            .upsert(progress_data, on_conflict="profile_id,role_type")
            .execute())

        if not response.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to save onboarding progress"
            )

        saved_progress = response.data[0]

        return OnboardingProgressResponse(
            success=True,
            message="Onboarding progress saved successfully",
            progress_id=saved_progress.get("id"),
            updated_at=saved_progress.get("updated_at"),
            current_step=saved_progress.get("current_step"),
            step_data=saved_progress.get("step_data")
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save progress: {str(e)}"
        )


@router.get("/progress/{role_type}", response_model=OnboardingProgressResponse)
async def get_onboarding_progress(
    role_type: str,
    user_id: str = Depends(verify_token),
    supabase: Client = Depends(get_supabase)
):
    """
    Get user's saved onboarding progress for a specific role.

    Used to restore onboarding state when user returns to the wizard.

    Args:
        role_type: Role type (tutor, client, or agent)
        user_id: Authenticated user ID from JWT token
        supabase: Supabase client instance

    Returns:
        OnboardingProgressResponse with saved progress data

    Raises:
        HTTPException: If no progress found or retrieval fails
    """
    # Validate role_type
    if role_type not in ["tutor", "client", "agent"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid role_type. Must be 'tutor', 'client', or 'agent'"
        )

    try:
        # Query onboarding_progress for this user + role
        response = (supabase.table("onboarding_progress")
            .select("*")
            .eq("profile_id", user_id)
            .eq("role_type", role_type)
            .maybeSingle()  # Returns None if not found, single record if found
            .execute())

        if not response.data:
            # No progress found - return 404
            raise HTTPException(
                status_code=404,
                detail=f"No onboarding progress found for role: {role_type}"
            )

        progress = response.data

        return OnboardingProgressResponse(
            success=True,
            message="Onboarding progress retrieved successfully",
            progress_id=progress.get("id"),
            updated_at=progress.get("updated_at"),
            current_step=progress.get("current_step"),
            step_data=progress.get("step_data")
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve progress: {str(e)}"
        )


@router.delete("/progress/{role_type}")
async def delete_onboarding_progress(
    role_type: str,
    user_id: str = Depends(verify_token),
    supabase: Client = Depends(get_supabase)
):
    """
    Delete user's onboarding progress for a specific role.

    Useful for resetting onboarding or cleaning up test data.

    Args:
        role_type: Role type (tutor, client, or agent)
        user_id: Authenticated user ID from JWT token
        supabase: Supabase client instance

    Returns:
        Success message

    Raises:
        HTTPException: If deletion fails
    """
    # Validate role_type
    if role_type not in ["tutor", "client", "agent"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid role_type. Must be 'tutor', 'client', or 'agent'"
        )

    try:
        response = (supabase.table("onboarding_progress")
            .delete()
            .eq("profile_id", user_id)
            .eq("role_type", role_type)
            .execute())

        return {
            "success": True,
            "message": f"Onboarding progress deleted for role: {role_type}"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete progress: {str(e)}"
        )
