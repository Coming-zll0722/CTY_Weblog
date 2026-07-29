from datetime import date, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    func,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin

JSON_TYPE = JSON().with_variant(JSONB(), "postgresql")


class User(TimestampMixin, Base):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(30), default="admin")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    token_version: Mapped[int] = mapped_column(Integer, default=1)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Category(TimestampMixin, Base):
    __tablename__ = "categories"
    name: Mapped[str] = mapped_column(String(80), unique=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    parent_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("categories.id", ondelete="SET NULL")
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Tag(TimestampMixin, Base):
    __tablename__ = "tags"
    name: Mapped[str] = mapped_column(String(80), unique=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)


class MediaFile(TimestampMixin, Base):
    __tablename__ = "media_files"
    storage_key: Mapped[str] = mapped_column(String(500), unique=True)
    original_name: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(120), index=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    alt_text: Mapped[str | None] = mapped_column(String(300))
    checksum: Mapped[str] = mapped_column(String(64), unique=True)
    uploader_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("users.id"))


class Post(TimestampMixin, Base):
    __tablename__ = "posts"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'published', 'archived')", name="post_status"),
        Index("ix_posts_status_published_at", "status", "published_at"),
    )
    title: Mapped[str] = mapped_column(String(180))
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    summary: Mapped[str] = mapped_column(Text)
    content_md: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    author_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    category_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("categories.id", ondelete="SET NULL")
    )
    cover_media_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("media_files.id", ondelete="SET NULL")
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    seo_title: Mapped[str | None] = mapped_column(String(180))
    seo_description: Mapped[str | None] = mapped_column(String(300))
    confidentiality_checked: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    view_count: Mapped[int] = mapped_column(BigInteger, default=0)


class PostTag(Base):
    __tablename__ = "post_tags"
    post_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True, index=True
    )


class Project(TimestampMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(
            "NOT is_public OR confidentiality_checked",
            name="public_requires_confidentiality_review",
        ),
        Index("ix_projects_featured_sort_order", "featured", "sort_order"),
    )
    title: Mapped[str] = mapped_column(String(180))
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    summary: Mapped[str] = mapped_column(Text)
    content_md: Mapped[str] = mapped_column(Text, default="")
    background_md: Mapped[str] = mapped_column(Text, default="")
    problem_md: Mapped[str] = mapped_column(Text, default="")
    role_md: Mapped[str] = mapped_column(Text, default="")
    architecture_md: Mapped[str] = mapped_column(Text, default="")
    features_md: Mapped[str] = mapped_column(Text, default="")
    challenges_md: Mapped[str] = mapped_column(Text, default="")
    solutions_md: Mapped[str] = mapped_column(Text, default="")
    outcomes_md: Mapped[str] = mapped_column(Text, default="")
    next_steps_md: Mapped[str] = mapped_column(Text, default="")
    confidentiality_note: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(30), index=True)
    owner_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    cover_media_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("media_files.id", ondelete="SET NULL")
    )
    started_at: Mapped[date | None] = mapped_column(Date)
    ended_at: Mapped[date | None] = mapped_column(Date)
    repo_url: Mapped[str | None] = mapped_column(String(2048))
    demo_url: Mapped[str | None] = mapped_column(String(2048))
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    confidentiality_checked: Mapped[bool] = mapped_column(Boolean, default=False)
    featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)


class ProjectTag(Base):
    __tablename__ = "project_tags"
    project_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True, index=True
    )


class ProjectPost(Base):
    __tablename__ = "project_posts"
    project_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True
    )
    post_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True, index=True
    )


class ProjectMedia(Base):
    __tablename__ = "project_media"
    project_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True
    )
    media_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("media_files.id", ondelete="CASCADE"), primary_key=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Timeline(TimestampMixin, Base):
    __tablename__ = "timelines"
    event_date: Mapped[date] = mapped_column(Date, index=True)
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text)
    event_type: Mapped[str] = mapped_column(String(50), index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class SiteSetting(TimestampMixin, Base):
    __tablename__ = "site_settings"
    key: Mapped[str] = mapped_column(String(120), unique=True)
    value_json: Mapped[Any] = mapped_column(JSON_TYPE, default=dict)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_by: Mapped[UUID] = mapped_column(Uuid, ForeignKey("users.id"))


class Link(TimestampMixin, Base):
    __tablename__ = "links"
    name: Mapped[str] = mapped_column(String(120))
    url: Mapped[str] = mapped_column(String(2048), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class OperationLog(TimestampMixin, Base):
    __tablename__ = "operation_logs"
    actor_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL")
    )
    action: Mapped[str] = mapped_column(String(120))
    resource_type: Mapped[str] = mapped_column(String(80))
    resource_id: Mapped[UUID | None] = mapped_column(Uuid)
    ip_hash: Mapped[str | None] = mapped_column(String(64))
    detail_json: Mapped[dict] = mapped_column(JSON_TYPE, default=dict)


class Comment(TimestampMixin, Base):
    __tablename__ = "comments"
    post_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("posts.id", ondelete="CASCADE"), index=True
    )
    parent_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("comments.id", ondelete="CASCADE")
    )
    author_name: Mapped[str] = mapped_column(String(100))
    author_email_hash: Mapped[str] = mapped_column(String(64))
    content: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)


class PageView(Base):
    __tablename__ = "page_views"
    __table_args__ = (Index("ix_page_views_path_viewed_at", "path", "viewed_at"),)
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    path: Mapped[str] = mapped_column(String(500), index=True)
    content_type: Mapped[str | None] = mapped_column(String(40))
    content_id: Mapped[UUID | None] = mapped_column(Uuid)
    visitor_hash: Mapped[str | None] = mapped_column(String(64))
    referer_host: Mapped[str | None] = mapped_column(String(255))
    viewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, server_default=func.now()
    )


class Redirect(TimestampMixin, Base):
    __tablename__ = "redirects"
    __table_args__ = (UniqueConstraint("source_path", name="uq_redirects_source_path"),)
    source_path: Mapped[str] = mapped_column(String(500), index=True)
    target_path: Mapped[str] = mapped_column(String(500))
    status_code: Mapped[int] = mapped_column(Integer, default=301)


class Backup(TimestampMixin, Base):
    __tablename__ = "backups"
    status: Mapped[str] = mapped_column(String(30), index=True)
    storage_key: Mapped[str | None] = mapped_column(String(500))
    size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    checksum: Mapped[str | None] = mapped_column(String(64))
    started_by: Mapped[UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)
