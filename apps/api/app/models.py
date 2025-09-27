"""
Data models for the Tutorwise backend.
"""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    """User role enumeration."""
    STUDENT = "student"
    TUTOR = "tutor"
    ADMIN = "admin"


class UserStatus(str, Enum):
    """User status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class LessonStatus(str, Enum):
    """Lesson status enumeration."""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# Request/Response Models
class UserCreateRequest(BaseModel):
    """Request model for creating a user."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    username: str = Field(..., min_length=3, max_length=50)
    full_name: str = Field(..., min_length=1, max_length=100)
    role: UserRole = UserRole.STUDENT


class UserLoginRequest(BaseModel):
    """Request model for user login."""
    email: EmailStr
    password: str


class UserUpdateRequest(BaseModel):
    """Request model for updating user information."""
    full_name: str | None = Field(None, min_length=1, max_length=100)
    username: str | None = Field(None, min_length=3, max_length=50)


class TutorProfileRequest(BaseModel):
    """Request model for tutor profile."""
    subjects: list[str] = Field(..., min_items=1)
    hourly_rate: float = Field(..., gt=0)
    bio: str | None = Field(None, max_length=1000)
    experience_years: int | None = Field(None, ge=0)


class UserResponse(BaseModel):
    """Response model for user data."""
    id: str
    email: EmailStr
    username: str
    full_name: str
    role: UserRole
    status: UserStatus
    created_at: datetime
    updated_at: datetime


class TutorResponse(UserResponse):
    """Response model for tutor data."""
    subjects: list[str]
    hourly_rate: float
    bio: str | None = None
    experience_years: int | None = None
    rating: float | None = None
    total_lessons: int = 0


class AuthTokenResponse(BaseModel):
    """Response model for authentication tokens."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class LessonCreateRequest(BaseModel):
    """Request model for creating a lesson."""
    tutor_id: str
    subject: str
    scheduled_time: datetime
    duration_minutes: int = Field(..., gt=0, le=180)
    notes: str | None = Field(None, max_length=500)


class LessonResponse(BaseModel):
    """Response model for lesson data."""
    id: str
    tutor_id: str
    student_id: str
    subject: str
    scheduled_time: datetime
    duration_minutes: int
    status: LessonStatus
    price: float
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class ErrorResponse(BaseModel):
    """Standard error response model."""
    error: str
    message: str
    details: dict | None = None


class SuccessResponse(BaseModel):
    """Standard success response model."""
    message: str
    data: dict | None = None
