import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Import all routes
from app.routes import auth, predict, post, user, admin, upload

# -----------------------------
# CREATE FASTAPI APP
# -----------------------------
app = FastAPI(
    title="EcoVision AI Backend",
    version="1.0.0",
    description="Backend API for EcoVision AI services.",
)

# -----------------------------
# CORS CONFIGURATION
# -----------------------------
# Read allowed origins from env so the Vercel URL can be injected at deploy time.
# Falls back to wildcard for local development.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")

if _raw_origins == "*":
    ALLOWED_ORIGINS = ["*"]
    ALLOW_CREDENTIALS = False  # credentials not allowed with wildcard origin
else:
    ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",")]
    ALLOW_CREDENTIALS = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# STATIC FILES (FOR IMAGE ACCESS)
# -----------------------------
# On Render free tier the filesystem is ephemeral, but we still mount /uploads
# so local dev and any persistent-disk setup works unchanged.
UPLOADS_DIR = os.getenv(
    "UPLOADS_DIR",
    os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")),
)
os.makedirs(UPLOADS_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# -----------------------------
# ROUTERS
# -----------------------------
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(predict.router, tags=["Prediction"])
app.include_router(post.router, prefix="/posts", tags=["Posts"])
app.include_router(user.router, prefix="/user", tags=["User"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(upload.router, prefix="/upload", tags=["Upload"])

# -----------------------------
# HEALTH CHECK
# -----------------------------
@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "message": "EcoVision AI backend is running.",
    }