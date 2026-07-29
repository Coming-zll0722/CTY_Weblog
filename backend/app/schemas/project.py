from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def _validate_https_url(value: str | None) -> str | None:
    if value is None:
        return None
    from urllib.parse import urlsplit

    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("project links must use an absolute HTTPS URL")
    return value


class ProjectCreate(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=200)
    summary: str = Field(min_length=10, max_length=500)
    content_md: str = ""
    background_md: str = ""
    problem_md: str = ""
    role_md: str = ""
    architecture_md: str = ""
    features_md: str = ""
    challenges_md: str = ""
    solutions_md: str = ""
    outcomes_md: str = ""
    next_steps_md: str = ""
    confidentiality_note: str = ""
    status: str = Field(min_length=2, max_length=30)
    tag_ids: list[UUID] = Field(default_factory=list)
    related_post_ids: list[UUID] = Field(default_factory=list)
    screenshot_media_ids: list[UUID] = Field(default_factory=list)
    cover_media_id: UUID | None = None
    started_at: date | None = None
    ended_at: date | None = None
    repo_url: str | None = Field(default=None, max_length=2048)
    demo_url: str | None = Field(default=None, max_length=2048)
    is_public: bool = False
    confidentiality_checked: bool = False
    featured: bool = False
    sort_order: int = 0

    _validate_repo_url = field_validator("repo_url")(_validate_https_url)
    _validate_demo_url = field_validator("demo_url")(_validate_https_url)

    @model_validator(mode="after")
    def require_confidentiality_review(self) -> "ProjectCreate":
        if self.is_public and not self.confidentiality_checked:
            raise ValueError("public projects require a confidentiality review")
        return self


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=180)
    slug: str | None = Field(
        default=None, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=200
    )
    summary: str | None = Field(default=None, min_length=10, max_length=500)
    content_md: str | None = None
    background_md: str | None = None
    problem_md: str | None = None
    role_md: str | None = None
    architecture_md: str | None = None
    features_md: str | None = None
    challenges_md: str | None = None
    solutions_md: str | None = None
    outcomes_md: str | None = None
    next_steps_md: str | None = None
    confidentiality_note: str | None = None
    status: str | None = Field(default=None, min_length=2, max_length=30)
    tag_ids: list[UUID] | None = None
    related_post_ids: list[UUID] | None = None
    screenshot_media_ids: list[UUID] | None = None
    cover_media_id: UUID | None = None
    started_at: date | None = None
    ended_at: date | None = None
    repo_url: str | None = Field(default=None, max_length=2048)
    demo_url: str | None = Field(default=None, max_length=2048)
    is_public: bool | None = None
    confidentiality_checked: bool | None = None
    featured: bool | None = None
    sort_order: int | None = None
    version: int = Field(ge=1)

    _validate_repo_url = field_validator("repo_url")(_validate_https_url)
    _validate_demo_url = field_validator("demo_url")(_validate_https_url)


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    title: str
    slug: str
    summary: str
    content_md: str
    background_md: str
    problem_md: str
    role_md: str
    architecture_md: str
    features_md: str
    challenges_md: str
    solutions_md: str
    outcomes_md: str
    next_steps_md: str
    confidentiality_note: str
    status: str
    tags: list[str] = Field(default_factory=list)
    started_at: date | None
    ended_at: date | None
    repo_url: str | None
    demo_url: str | None
    is_public: bool
    confidentiality_checked: bool
    featured: bool
    sort_order: int
    version: int
    updated_at: datetime
