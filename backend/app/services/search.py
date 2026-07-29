from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.content import ContentRepository

DEFAULT_SUGGESTIONS = ["TCP", "自动化测试", "Python", "FPGA", "软件架构"]


async def search_content(
    session: AsyncSession,
    query: str,
    page: int,
    page_size: int,
    category: str | None = None,
) -> dict:
    repository = ContentRepository(session)
    candidate_limit = min(page * page_size, 100)
    posts, post_total = await repository.list_posts(
        1,
        candidate_limit,
        q=query,
        category=category,
    )
    projects, project_total = (
        ([], 0)
        if category
        else await repository.list_projects(1, candidate_limit, q=query)
    )
    items = [
        {
            "type": "post",
            "title": item["title"],
            "summary": item["summary"],
            "slug": item["slug"],
            "matched_fields": _matched_fields(
                item, query, ("title", "summary", "tags", "category")
            ),
            "score": _relevance(item, query),
        }
        for item in posts
    ] + [
        {
            "type": "project",
            "title": item["title"],
            "summary": item["summary"],
            "slug": item["slug"],
            "matched_fields": _matched_fields(item, query, ("title", "summary", "tags")),
            "score": _relevance(item, query),
        }
        for item in projects
    ]
    items.sort(key=lambda item: (-item["score"], item["title"].casefold()))
    offset = (page - 1) * page_size
    page_items = items[offset : offset + page_size]
    for item in page_items:
        item.pop("score")
    return {
        "query": query,
        "items": page_items,
        "total": post_total + project_total,
        "suggestions": [] if items else DEFAULT_SUGGESTIONS,
    }


def _matched_fields(item: dict, query: str, fields: tuple[str, ...]) -> list[str]:
    normalized = query.casefold()
    matched: list[str] = []
    for field in fields:
        value = item.get(field)
        text = " ".join(value) if isinstance(value, list) else str(value or "")
        if normalized in text.casefold():
            matched.append(field)
    return matched


def _relevance(item: dict, query: str) -> int:
    matches = set(_matched_fields(item, query, ("title", "summary", "tags", "category")))
    return (
        (4 if "title" in matches else 0)
        + (2 if "summary" in matches else 0)
        + (1 if "tags" in matches else 0)
        + (1 if "category" in matches else 0)
    )
