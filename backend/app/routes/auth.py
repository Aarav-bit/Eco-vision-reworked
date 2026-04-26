from fastapi import APIRouter, HTTPException, status

from app.models.user import AuthResponse, UserLoginRequest, UserSignupRequest
from app.services.auth_service import login_user, signup_user


router = APIRouter(tags=["Authentication"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: UserSignupRequest) -> AuthResponse:
    print(f"[SIGNUP] Request received: {payload.email}")
    try:
        result = signup_user(
            name=payload.name,
            email=payload.email,
            password=payload.password,
            is_admin=payload.is_admin,
        )
        print(f"[SIGNUP] Success: {payload.email}")
        return AuthResponse(**result)
    except HTTPException as exc:
        print(f"[SIGNUP] Failed: {payload.email} - {exc.detail}")
        raise exc


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLoginRequest) -> AuthResponse:
    print(f"[LOGIN] Request received: {payload.email}")
    try:
        result = login_user(email=payload.email, password=payload.password)
        print(f"[LOGIN] Success: {payload.email}")
        return AuthResponse(**result)
    except HTTPException as exc:
        print(f"[LOGIN] Failed: {payload.email} - {exc.detail}")
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            ) from exc
        raise exc


@router.post("/admin/login", response_model=AuthResponse)
def admin_login(payload: UserLoginRequest) -> AuthResponse:
    print(f"[ADMIN LOGIN] Request received: {payload.email}")
    try:
        result = login_user(
            email=payload.email,
            password=payload.password,
            admin_only=True,
        )
        print(f"[ADMIN LOGIN] Success: {payload.email}")
        return AuthResponse(**result)
    except HTTPException as exc:
        print(f"[ADMIN LOGIN] Failed: {payload.email} - {exc.detail}")
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            ) from exc
        if exc.status_code == status.HTTP_403_FORBIDDEN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized access",
            ) from exc
        raise exc
