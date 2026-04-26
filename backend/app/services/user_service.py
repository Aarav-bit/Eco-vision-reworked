from typing import Dict, List

from bson import ObjectId
from bson.errors import InvalidId

from app.utils.db import get_database


USERS_COLLECTION = "users"
POSTS_COLLECTION = "posts"


def get_user_stats(user_id: str) -> Dict[str, float]:
    db = get_database()
    users_collection = db[USERS_COLLECTION]
    posts_collection = db[POSTS_COLLECTION]

    total_posts = posts_collection.count_documents({"user_id": user_id})

    user = None
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
    except (InvalidId, TypeError):
        user = users_collection.find_one({"_id": user_id})

    total_points = 0
    total_co2_saved = 0.0
    if user:
        total_points = int(user.get("points", 0))
        total_co2_saved = float(user.get("co2_saved", 0.0))

    return {
        "total_posts": total_posts,
        "total_points": total_points,
        "total_co2_saved": total_co2_saved,
    }


def get_user_profile(user_id: str) -> Dict:
    """Return public profile fields for the authenticated user."""
    db = get_database()
    users_collection = db[USERS_COLLECTION]
    posts_collection = db[POSTS_COLLECTION]

    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
    except (InvalidId, TypeError):
        user = users_collection.find_one({"_id": user_id})

    if not user:
        raise ValueError("User not found.")

    total_posts = posts_collection.count_documents({"user_id": user_id})
    return {
        "user_id": user_id,
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "points": int(user.get("points", 0)),
        "co2_saved": float(user.get("co2_saved", 0.0)),
        "total_posts": total_posts,
        "is_admin": bool(user.get("is_admin", False)),
    }


def update_user_profile(user_id: str, name: str) -> Dict:
    """Update the user's display name."""
    db = get_database()
    users_collection = db[USERS_COLLECTION]

    name = name.strip()
    if len(name) < 2 or len(name) > 100:
        raise ValueError("Name must be between 2 and 100 characters.")

    try:
        query = {"_id": ObjectId(user_id)}
    except (InvalidId, TypeError):
        query = {"_id": user_id}

    result = users_collection.update_one(query, {"$set": {"name": name}})
    if result.matched_count == 0:
        raise ValueError("User not found.")

    return {"message": "Profile updated.", "name": name}


def get_leaderboard(limit: int = 10) -> List[Dict]:
    """Return top users ranked by points."""
    db = get_database()
    users_collection = db[USERS_COLLECTION]
    posts_collection = db[POSTS_COLLECTION]

    top_users = list(
        users_collection.find(
            {"is_admin": {"$ne": True}},
            {"_id": 1, "name": 1, "email": 1, "points": 1, "co2_saved": 1},
        )
        .sort("points", -1)
        .limit(limit)
    )

    result = []
    for rank, user in enumerate(top_users, start=1):
        user_id = str(user["_id"])
        post_count = posts_collection.count_documents({"user_id": user_id})
        result.append(
            {
                "rank": rank,
                "user_id": user_id,
                "name": user.get("name", ""),
                "email": user.get("email", ""),
                "points": int(user.get("points", 0)),
                "co2_saved": float(user.get("co2_saved", 0.0)),
                "total_posts": post_count,
            }
        )

    return result
