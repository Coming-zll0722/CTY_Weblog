from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PostCreate(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=200)
    summary: str = Field(min_length=10, max_length=500)
    content_md: str = Field(min_length=1)
    category_id: UUID | None = None
    tag_ids: list[UUID] = []
    status: str = Field(default="draft", pattern=r"^(draft|published|archived)$")
    seo_title: str | None = Field(default=None, max_length=180)
    seo_description: str | None = Field(default=None, max_length=300)


class PostUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=180)
    summary: str | None = Field(default=None, min_length=10, max_length=500)
    content_md: str | None = None
    category_id: UUID | None = None
    tag_ids: list[UUID] | None = None
    status: str | None = Field(default=None, pattern=r"^(draft|published|archived)$")
    version: int = Field(ge=1)


class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    title: str
    slug: str
    summary: str
    content_md: str
    status: str
    published_at: datetime | None
    updated_at: datetime
