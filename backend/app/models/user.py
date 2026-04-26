from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserSignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    is_admin: bool = False


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserInDB(BaseModel):
    id: Optional[str] = None
    name: str
    email: EmailStr
    hashed_password: str
    is_admin: bool = False


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    # Bug fix: name was missing from AuthResponse — login was returning empty name
    name: str = ""
    email: EmailStr
    is_admin: bool


class UserStatsResponse(BaseModel):
    total_posts: int
    total_points: int
    total_co2_saved: float
