"""
Authentication endpoints for the Tutorwise backend.
"""
import logging
from datetime import datetime, timedelta

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db import neo4j_driver, redis_client
from app.models import (
    AuthTokenResponse,
    UserCreateRequest,
    UserLoginRequest,
    UserResponse,
    UserRole,
    UserStatus,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

# JWT Configuration
SECRET_KEY = "your-secret-key-here"  # TODO: Move to environment variables
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


class AuthService:
    """Authentication service class."""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt."""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

    @staticmethod
    def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def verify_token(token: str) -> dict | None:
        """Verify and decode a JWT token."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current user from JWT token."""
    token = credentials.credentials
    payload = AuthService.verify_token(token)

    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    return payload


def create_user_in_db(user_data: UserCreateRequest) -> str:
    """Create a user in Neo4j database."""
    if not neo4j_driver:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection not available"
        )

    def _create_user(tx):
        # Check if user already exists
        result = tx.run(
            "MATCH (u:User {email: $email}) RETURN u",
            email=user_data.email
        )
        if result.single():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )

        # Check if username is taken
        result = tx.run(
            "MATCH (u:User {username: $username}) RETURN u",
            username=user_data.username
        )
        if result.single():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is already taken"
            )

        # Create new user
        user_id = f"user_{datetime.utcnow().timestamp()}"
        hashed_password = AuthService.hash_password(user_data.password)
        now = datetime.utcnow().isoformat()

        tx.run("""
            CREATE (u:User {
                id: $id,
                email: $email,
                username: $username,
                full_name: $full_name,
                password_hash: $password_hash,
                role: $role,
                status: $status,
                created_at: $created_at,
                updated_at: $updated_at
            })
        """,
            id=user_id,
            email=user_data.email,
            username=user_data.username,
            full_name=user_data.full_name,
            password_hash=hashed_password,
            role=user_data.role.value,
            status=UserStatus.ACTIVE.value,
            created_at=now,
            updated_at=now
        )

        return user_id

    try:
        with neo4j_driver.session() as session:
            user_id = session.write_transaction(_create_user)
            return user_id
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )


def get_user_by_email(email: str) -> dict | None:
    """Get user by email from Neo4j database."""
    if not neo4j_driver:
        return None

    def _get_user(tx):
        result = tx.run(
            "MATCH (u:User {email: $email}) RETURN u",
            email=email
        )
        record = result.single()
        return dict(record["u"]) if record else None

    try:
        with neo4j_driver.session() as session:
            return session.read_transaction(_get_user)
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        return None


@router.post("/register", response_model=AuthTokenResponse)
async def register(user_data: UserCreateRequest):
    """Register a new user."""
    logger.info(f"Registration attempt for email: {user_data.email}")

    try:
        # Create user in database
        user_id = create_user_in_db(user_data)

        # Create access token
        token_data = {"sub": user_id, "email": user_data.email, "role": user_data.role.value}
        access_token = AuthService.create_access_token(token_data)

        # Create user response
        user_response = UserResponse(
            id=user_id,
            email=user_data.email,
            username=user_data.username,
            full_name=user_data.full_name,
            role=user_data.role,
            status=UserStatus.ACTIVE,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        return AuthTokenResponse(
            access_token=access_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_response
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=AuthTokenResponse)
async def login(login_data: UserLoginRequest):
    """Authenticate user and return access token."""
    logger.info(f"Login attempt for email: {login_data.email}")

    # Get user from database
    user = get_user_by_email(login_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Verify password
    if not AuthService.verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check user status
    if user["status"] != UserStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is not active"
        )

    # Create access token
    token_data = {"sub": user["id"], "email": user["email"], "role": user["role"]}
    access_token = AuthService.create_access_token(token_data)

    # Store session in Redis if available
    if redis_client:
        try:
            session_key = f"session:{user['id']}"
            session_data = {
                "user_id": user["id"],
                "email": user["email"],
                "role": user["role"],
                "login_time": datetime.utcnow().isoformat()
            }
            redis_client.setex(session_key, 3600, str(session_data))  # 1 hour expiry
        except Exception as e:
            logger.warning(f"Failed to store session in Redis: {e}")

    # Create user response
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        status=UserStatus(user["status"]),
        created_at=datetime.fromisoformat(user["created_at"]),
        updated_at=datetime.fromisoformat(user["updated_at"])
    )

    return AuthTokenResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_response
    )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout user and invalidate session."""
    user_id = current_user["sub"]
    logger.info(f"Logout for user: {user_id}")

    # Remove session from Redis if available
    if redis_client:
        try:
            session_key = f"session:{user_id}"
            redis_client.delete(session_key)
        except Exception as e:
            logger.warning(f"Failed to remove session from Redis: {e}")

    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information."""
    user_email = current_user["email"]
    user = get_user_by_email(user_email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        status=UserStatus(user["status"]),
        created_at=datetime.fromisoformat(user["created_at"]),
        updated_at=datetime.fromisoformat(user["updated_at"])
    )


@router.post("/verify-token")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """Verify if the provided token is valid."""
    return {
        "valid": True,
        "user_id": current_user["sub"],
        "email": current_user["email"],
        "role": current_user["role"]
    }
