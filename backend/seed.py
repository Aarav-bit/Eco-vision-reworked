"""
Seed script — inserts dummy users and posts into the EcoVision MongoDB database.

Run from the backend/ directory:
    python seed.py

What it does:
  - Creates 5 dummy users (skips if email already exists)
  - Creates 15 dummy posts spread across those users
  - Downloads real placeholder images from picsum.photos and saves them
    to the uploads/ folder so they actually render in the frontend
  - Idempotent: safe to run multiple times (won't duplicate users)
"""

from __future__ import annotations

import os
import sys
import uuid
import urllib.request
from datetime import datetime, timedelta, timezone

# ── make sure app.* imports work ──────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.utils.db import get_database
from app.utils.auth import hash_password

# ─────────────────────────────────────────────────────────────────────────────
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

USERS_COLLECTION = "users"
POSTS_COLLECTION = "posts"

# ── Dummy users ───────────────────────────────────────────────────────────────
DUMMY_USERS = [
    {"name": "Alice Green",   "email": "alice@ecovision.dev",   "password": "password123"},
    {"name": "Bob Recycler",  "email": "bob@ecovision.dev",     "password": "password123"},
    {"name": "Clara Earth",   "email": "clara@ecovision.dev",   "password": "password123"},
    {"name": "David Eco",     "email": "david@ecovision.dev",   "password": "password123"},
    {"name": "Eva Nature",    "email": "eva@ecovision.dev",     "password": "password123"},
]

# ── Dummy posts ───────────────────────────────────────────────────────────────
# Each entry: (waste_type, recycled, points, co2, days_ago)
DUMMY_POSTS = [
    ("plastic",   True,  10, 0.5,  1),
    ("cardboard", True,  10, 0.5,  2),
    ("glass",     True,  10, 0.5,  3),
    ("metal",     True,  10, 0.5,  4),
    ("paper",     False,  2, 0.0,  5),
    ("plastic",   False,  2, 0.0,  6),
    ("cardboard", True,  10, 0.5,  7),
    ("glass",     False,  2, 0.0,  8),
    ("metal",     True,  10, 0.5,  9),
    ("paper",     True,  10, 0.5, 10),
    ("plastic",   True,  10, 0.5, 11),
    ("cardboard", False,  2, 0.0, 12),
    ("glass",     True,  10, 0.5, 13),
    ("metal",     False,  2, 0.0, 14),
    ("paper",     True,  10, 0.5, 15),
]

# Picsum image IDs — varied nature/object photos that look like waste items
BEFORE_IMAGE_IDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150]
AFTER_IMAGE_IDS  = [11, 21, 31, 41, 51, 61, 71, 81, 91, 101, 111, 121, 131, 141, 151]


def download_image(picsum_id: int, filename: str) -> str:
    """Download a 400x400 image from picsum.photos and save to uploads/."""
    dest = os.path.join(UPLOADS_DIR, filename)
    if os.path.exists(dest):
        return f"/uploads/{filename}"
    url = f"https://picsum.photos/id/{picsum_id}/400/400"
    try:
        print(f"  ↓ Downloading picsum/{picsum_id} → {filename} ...", end=" ")
        req = urllib.request.Request(url, headers={"User-Agent": "EcoVision-Seed/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            with open(dest, "wb") as f:
                f.write(resp.read())
        print("✅")
    except Exception as exc:
        print(f"⚠️  failed ({exc}) — using placeholder path")
    return f"/uploads/{filename}"


def seed():
    db = get_database()
    users_col = db[USERS_COLLECTION]
    posts_col  = db[POSTS_COLLECTION]

    # ── 1. Create users ───────────────────────────────────────────────────
    print("\n── Creating dummy users ──────────────────────────────────────")
    user_ids: list[str] = []
    for u in DUMMY_USERS:
        existing = users_col.find_one({"email": u["email"]})
        if existing:
            print(f"  ⏭  {u['name']} already exists — skipping")
            user_ids.append(str(existing["_id"]))
            continue

        from bson import ObjectId
        doc = {
            "name":            u["name"],
            "email":           u["email"],
            "hashed_password": hash_password(u["password"]),
            "is_admin":        False,
            "points":          0,
            "co2_saved":       0.0,
        }
        result = users_col.insert_one(doc)
        user_ids.append(str(result.inserted_id))
        print(f"  ✅ Created user: {u['name']} ({u['email']})")

    # ── 2. Create posts ───────────────────────────────────────────────────
    print("\n── Creating dummy posts ──────────────────────────────────────")
    now = datetime.now(timezone.utc)

    for i, (waste_type, recycled, pts, co2, days_ago) in enumerate(DUMMY_POSTS):
        user_id = user_ids[i % len(user_ids)]

        # Download before/after images
        before_fname = f"seed_before_{BEFORE_IMAGE_IDS[i]}_{uuid.uuid4().hex[:6]}.jpg"
        after_fname  = f"seed_after_{AFTER_IMAGE_IDS[i]}_{uuid.uuid4().hex[:6]}.jpg"
        before_path  = download_image(BEFORE_IMAGE_IDS[i], before_fname)
        after_path   = download_image(AFTER_IMAGE_IDS[i],  after_fname)

        post_doc = {
            "user_id":           user_id,
            "before_image_path": before_path,
            "after_image_path":  after_path,
            "waste_type":        waste_type,
            "recycled":          recycled,
            "timestamp":         now - timedelta(days=days_ago),
            "likes":             [],
        }
        posts_col.insert_one(post_doc)

        # Update user points + co2
        from bson import ObjectId
        try:
            users_col.update_one(
                {"_id": ObjectId(user_id)},
                {"$inc": {"points": pts, "co2_saved": co2}},
            )
        except Exception:
            pass

        recycled_str = "♻️  recycled" if recycled else "🗑  disposed"
        print(f"  ✅ Post {i+1:02d}: {waste_type:<10} {recycled_str}")

    # ── 3. Summary ────────────────────────────────────────────────────────
    total_users = users_col.count_documents({})
    total_posts = posts_col.count_documents({})
    print(f"\n── Done ──────────────────────────────────────────────────────")
    print(f"  Users in DB : {total_users}")
    print(f"  Posts in DB : {total_posts}")
    print(f"\n  Login with any seed user:")
    for u in DUMMY_USERS:
        print(f"    {u['email']}  /  {u['password']}")
    print()


if __name__ == "__main__":
    seed()
