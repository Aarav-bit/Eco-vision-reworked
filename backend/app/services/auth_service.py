from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.models.user import UserInDB
from app.utils.auth import create_access_token, hash_password, verify_password
from app.utils.db import get_database


USERS_COLLECTION = "users"


def signup_user(name: str, email: str, password: str, is_admin: bool = False) -> dict:
    db = get_database()
    users_collection = db[USERS_COLLECTION]

    if users_collection.find_one({"email": email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists.",
        )

    user = UserInDB(
        name=name,
        email=email,
        hashed_password=hash_password(password),
        is_admin=is_admin,
    )

    try:
        inserted = users_collection.insert_one(user.model_dump(exclude={"id"}))
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists.",
        ) from exc

    token_payload = {
        "sub": str(inserted.inserted_id),
        "email": email,
        # Bug fix: Include name in JWT so login can return the real user name
        "name": name,
        "is_admin": is_admin,
        "role": "admin" if is_admin else "user",
    }
    access_token = create_access_token(token_payload)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(inserted.inserted_id),
        "name": name,
        "email": email,
        "is_admin": is_admin,
    }


def login_user(email: str, password: str, admin_only: bool = False) -> dict:
    db = get_database()
    users_collection = db[USERS_COLLECTION]

    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not verify_password(password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if admin_only and not user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )

    user_id = str(user["_id"])
    token_payload = {
        "sub": user_id,
        "email": user["email"],
        # Bug fix: Include name in JWT payload so login returns the real user name
        "name": user.get("name", ""),
        "is_admin": user.get("is_admin", False),
        "role": "admin" if user.get("is_admin", False) else "user",
    }
    access_token = create_access_token(token_payload)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user_id,
        "name": user.get("name", ""),
        "email": user["email"],
        "is_admin": user.get("is_admin", False),
    }
