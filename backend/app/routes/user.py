from typing import Dict, List

from fastapi import APIRouter, Body, Header, HTTPException, Query, status

from app.models.user import UserStatsResponse
from app.services.user_service import (
    get_leaderboard,
    get_user_profile,
    get_user_stats,
    update_user_profile,
)
from app.utils.auth import AuthTokenError, decode_access_token_strict


router = APIRouter(tags=["User"])


def _extract_user_id_from_auth_header(authorization: str) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing or invalid")
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing or invalid")
    try:
        payload = decode_access_token_strict(parts[1].strip())
    except AuthTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    if "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing or invalid")
    return str(payload["sub"])


@router.get("/stats", response_model=UserStatsResponse, status_code=status.HTTP_200_OK)
def get_user_stats_endpoint(authorization: str = Header(...)) -> UserStatsResponse:
    user_id = _extract_user_id_from_auth_header(authorization)
    return UserStatsResponse(**get_user_stats(user_id))


@router.get("/profile", status_code=status.HTTP_200_OK)
def get_profile_endpoint(authorization: str = Header(...)) -> Dict:
    """Return the authenticated user's profile."""
    user_id = _extract_user_id_from_auth_header(authorization)
    try:
        return get_user_profile(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/profile", status_code=status.HTTP_200_OK)
def update_profile_endpoint(
    authorization: str = Header(...),
    name: str = Body(..., embed=True, min_length=2, max_length=100),
) -> Dict:
    """Update the authenticated user's display name."""
    user_id = _extract_user_id_from_auth_header(authorization)
    try:
        return update_user_profile(user_id, name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/leaderboard", status_code=status.HTTP_200_OK)
def leaderboard_endpoint(
    authorization: str = Header(...),
    limit: int = Query(default=10, ge=1, le=50),
) -> Dict:
    """Return top users ranked by eco points."""
    _extract_user_id_from_auth_header(authorization)
    return {"leaderboard": get_leaderboard(limit)}
