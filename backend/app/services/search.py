from datetime import UTC, datetime

from sqlalchemy import case, exists, func, literal, or_, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, Post, PostTag, Project, ProjectTag, Tag

DEFAULT_SUGGESTIONS = ["TCP", "自动化测试", "Python", "FPGA", "软件架构"]


async def search_content(
    session: AsyncSession,
    query: str,
    page: int,
    page_size: int,
    category: str | None = None,
) -> dict:
    """Rank, merge and paginate public posts and projects in the database."""

    normalized = query.strip()
    pattern = f"%{normalized}%"
    post_tag_match = exists(
        select(1)
        .select_from(PostTag)
        .join(Tag, Tag.id == PostTag.tag_id)
        .where(
            PostTag.post_id == Post.id,
            Tag.deleted_at.is_(None),
            or_(Tag.name.ilike(pattern), Tag.slug.ilike(pattern)),
        )
        .correlate(Post)
    )
    post_category_match = exists(
        select(1)
        .select_from(Category)
        .where(
            Category.id == Post.category_id,
            Category.deleted_at.is_(None),
            or_(Category.name.ilike(pattern), Category.slug.ilike(pattern)),
        )
        .correlate(Post)
    )
    post_title_match = Post.title.ilike(pattern)
    post_summary_match = Post.summary.ilike(pattern)
    post_score = (
        case((post_title_match, 40), else_=0)
        + case((post_summary_match, 20), else_=0)
        + case((post_tag_match, 10), else_=0)
        + case((post_category_match, 8), else_=0)
    )
    post_query = select(
        literal("post").label("type"),
        Post.title.label("title"),
        Post.summary.label("summary"),
        Post.slug.label("slug"),
        post_score.label("score"),
        Post.published_at.label("sort_at"),
        post_title_match.label("title_match"),
        post_summary_match.label("summary_match"),
        post_tag_match.label("tag_match"),
        post_category_match.label("category_match"),
    ).where(
        Post.deleted_at.is_(None),
        Post.status == "published",
        Post.published_at.is_not(None),
        Post.published_at <= datetime.now(UTC),
        or_(post_title_match, post_summary_match, post_tag_match, post_category_match),
    )
    if category:
        post_query = post_query.join(Category, Category.id == Post.category_id).where(
            Category.slug == category,
            Category.deleted_at.is_(None),
        )

    project_tag_match = exists(
        select(1)
        .select_from(ProjectTag)
        .join(Tag, Tag.id == ProjectTag.tag_id)
        .where(
            ProjectTag.project_id == Project.id,
            Tag.deleted_at.is_(None),
            or_(Tag.name.ilike(pattern), Tag.slug.ilike(pattern)),
        )
        .correlate(Project)
    )
    project_title_match = Project.title.ilike(pattern)
    project_summary_match = Project.summary.ilike(pattern)
    project_score = (
        case((project_title_match, 40), else_=0)
        + case((project_summary_match, 20), else_=0)
        + case((project_tag_match, 10), else_=0)
    )
    project_query = select(
        literal("project").label("type"),
        Project.title.label("title"),
        Project.summary.label("summary"),
        Project.slug.label("slug"),
        project_score.label("score"),
        Project.updated_at.label("sort_at"),
        project_title_match.label("title_match"),
        project_summary_match.label("summary_match"),
        project_tag_match.label("tag_match"),
        literal(False).label("category_match"),
    ).where(
        Project.deleted_at.is_(None),
        Project.is_public.is_(True),
        Project.confidentiality_checked.is_(True),
        or_(project_title_match, project_summary_match, project_tag_match),
    )

    combined = (
        post_query.subquery("search_results")
        if category
        else union_all(post_query, project_query).subquery("search_results")
    )
    total = int((await session.scalar(select(func.count()).select_from(combined))) or 0)
    rows = (
        await session.execute(
            select(combined)
            .order_by(
                combined.c.score.desc(),
                combined.c.sort_at.desc().nullslast(),
                combined.c.type.asc(),
                combined.c.slug.asc(),
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).mappings()
    items = []
    for row in rows:
        matched_fields = [
            field
            for field in ("title", "summary", "tag", "category")
            if row[f"{field}_match"]
        ]
        items.append(
            {
                "type": row["type"],
                "title": row["title"],
                "summary": row["summary"],
                "slug": row["slug"],
                "matched_fields": matched_fields,
            }
        )
    return {
        "query": normalized,
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "suggestions": [] if total else DEFAULT_SUGGESTIONS,
    }
