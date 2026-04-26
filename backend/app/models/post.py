from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class PostInDB(BaseModel):
    id: Optional[str] = None
    user_id: str
    before_image_path: str
    after_image_path: str
    waste_type: str = Field(..., min_length=1, max_length=100)
    recycled: bool
    timestamp: datetime
    likes: List[str] = Field(default_factory=list)  # list of user_ids who liked


class PostResponse(BaseModel):
    id: str
    user_id: str
    before_image_path: str
    after_image_path: str
    waste_type: str
    recycled: bool
    timestamp: datetime
    likes: List[str] = Field(default_factory=list)
    like_count: int = 0


class CreatePostRequestValidation(BaseModel):
    waste_type: str = Field(..., min_length=1, max_length=100)
    recycled: bool
