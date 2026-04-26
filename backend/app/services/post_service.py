import os
import uuid
from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import UploadFile

from app.models.post import PostInDB, PostResponse
from app.utils.db import get_database


POSTS_COLLECTION = "posts"
USERS_COLLECTION = "users"

# Bug fix: Use the persistent uploads directory served by StaticFiles,
# not tempfile.gettempdir() which is wiped by the OS and not URL-accessible.
POST_IMAGES_DIR = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "uploads")
)


def _ensure_post_images_dir() -> None:
    os.makedirs(POST_IMAGES_DIR, exist_ok=True)


def _save_uploaded_image(upload: UploadFile, prefix: str) -> str:
    _ensure_post_images_dir()
    ext = os.path.splitext(upload.filename or "")[1].lower() or ".jpg"
    file_name = f"{prefix}_{uuid.uuid4().hex}{ext}"
    target_path = os.path.join(POST_IMAGES_DIR, file_name)

    upload.file.seek(0)
    with open(target_path, "wb") as image_file:
        image_file.write(upload.file.read())

    # Bug fix: Return a URL path instead of an absolute filesystem path
    # so the frontend can use it directly as an image src.
    return f"/uploads/{file_name}"


def create_post(
    user_id: str,
    before_image: UploadFile,
    after_image: UploadFile,
    waste_type: str,
    recycled: bool,
) -> PostResponse:
    db = get_database()
    posts_collection = db[POSTS_COLLECTION]
    users_collection = db[USERS_COLLECTION]

    before_image_path = _save_uploaded_image(before_image, "before")
    after_image_path = _save_uploaded_image(after_image, "after")
    timestamp = datetime.now(timezone.utc)

    post = PostInDB(
        user_id=user_id,
        before_image_path=before_image_path,
        after_image_path=after_image_path,
        waste_type=waste_type,
        recycled=recycled,
        timestamp=timestamp,
    )

    inserted = posts_collection.insert_one(post.model_dump(exclude={"id"}))

    points_increment = 10 if recycled else 2
    co2_increment = 0.5 if recycled else 0.0
    try:
        user_query = {"_id": ObjectId(user_id)}
    except (InvalidId, TypeError):
        user_query = {"_id": user_id}

    users_collection.update_one(
        user_query,
        {"$inc": {"points": points_increment, "co2_saved": co2_increment}},
    )

    return PostResponse(
        id=str(inserted.inserted_id),
        user_id=user_id,
        before_image_path=before_image_path,
        after_image_path=after_image_path,
        waste_type=waste_type,
        recycled=recycled,
        timestamp=timestamp,
        likes=[],
        like_count=0,
    )


def get_all_posts() -> List[PostResponse]:
    db = get_database()
    posts_collection = db[POSTS_COLLECTION]

    posts: List[PostResponse] = []
    for record in posts_collection.find().sort("timestamp", -1):
        likes = record.get("likes", [])
        posts.append(
            PostResponse(
                id=str(record["_id"]),
                user_id=record["user_id"],
                before_image_path=record["before_image_path"],
                after_image_path=record["after_image_path"],
                waste_type=record["waste_type"],
                recycled=record["recycled"],
                timestamp=record["timestamp"],
                likes=likes,
                like_count=len(likes),
            )
        )

    return posts


def get_posts_by_user(user_id: str) -> List[PostResponse]:
    """Return all posts created by a specific user."""
    db = get_database()
    posts_collection = db[POSTS_COLLECTION]

    posts: List[PostResponse] = []
    for record in posts_collection.find({"user_id": user_id}).sort("timestamp", -1):
        likes = record.get("likes", [])
        posts.append(
            PostResponse(
                id=str(record["_id"]),
                user_id=record["user_id"],
                before_image_path=record["before_image_path"],
                after_image_path=record["after_image_path"],
                waste_type=record["waste_type"],
                recycled=record["recycled"],
                timestamp=record["timestamp"],
                likes=likes,
                like_count=len(likes),
            )
        )

    return posts


def toggle_like_post(post_id: str, user_id: str) -> PostResponse:
    """Toggle like on a post. Adds user_id if not liked, removes if already liked."""
    db = get_database()
    posts_collection = db[POSTS_COLLECTION]

    try:
        object_id = ObjectId(post_id)
    except (InvalidId, TypeError) as exc:
        raise ValueError("Invalid post id.") from exc

    record = posts_collection.find_one({"_id": object_id})
    if not record:
        raise ValueError("Post not found.")

    likes: List[str] = record.get("likes", [])
    if user_id in likes:
        # Unlike
        posts_collection.update_one({"_id": object_id}, {"$pull": {"likes": user_id}})
        likes.remove(user_id)
    else:
        # Like
        posts_collection.update_one({"_id": object_id}, {"$addToSet": {"likes": user_id}})
        likes.append(user_id)

    return PostResponse(
        id=str(record["_id"]),
        user_id=record["user_id"],
        before_image_path=record["before_image_path"],
        after_image_path=record["after_image_path"],
        waste_type=record["waste_type"],
        recycled=record["recycled"],
        timestamp=record["timestamp"],
        likes=likes,
        like_count=len(likes),
    )


def delete_own_post(post_id: str, user_id: str) -> dict:
    """Delete a post only if it belongs to the requesting user."""
    db = get_database()
    posts_collection = db[POSTS_COLLECTION]

    try:
        object_id = ObjectId(post_id)
    except (InvalidId, TypeError) as exc:
        raise ValueError("Invalid post id.") from exc

    record = posts_collection.find_one({"_id": object_id})
    if not record:
        raise ValueError("Post not found.")
    if record["user_id"] != user_id:
        raise PermissionError("You can only delete your own posts.")

    posts_collection.delete_one({"_id": object_id})
    return {"message": "Post deleted successfully."}
