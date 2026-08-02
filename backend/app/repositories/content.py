from collections.abc import Iterable
from datetime import UTC, datetime
import re
from uuid import UUID

from sqlalchemy import and_, case, delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models import (
    Category,
    MediaFile,
    Post,
    PostTag,
    Project,
    ProjectMedia,
    ProjectPost,
    ProjectTag,
    Redirect,
    Tag,
)
from app.schemas.post import PostCreate, PostUpdate
from app.schemas.project import ProjectCreate, ProjectUpdate


class ContentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_posts(
        self,
        page: int,
        page_size: int,
        q: str | None = None,
        category: str | None = None,
        tag: str | None = None,
        include_unpublished: bool = False,
        include_deleted: bool = False,
    ) -> tuple[list[dict], int]:
        filters = [] if include_deleted else [Post.deleted_at.is_(None)]
        if not include_unpublished:
            filters.extend(
                [
                    Post.status == "published",
                    Post.published_at.is_not(None),
                    Post.published_at <= datetime.now(UTC),
                ]
            )
        order_columns = [Post.published_at.desc(), Post.created_at.desc()]
        if q:
            pattern = f"%{q.strip()}%"
            tag_posts = (
                select(PostTag.post_id)
                .join(Tag, Tag.id == PostTag.tag_id)
                .where(or_(Tag.name.ilike(pattern), Tag.slug.ilike(pattern)))
            )
            category_ids = select(Category.id).where(
                or_(Category.name.ilike(pattern), Category.slug.ilike(pattern))
            )
            filters.append(
                or_(
                    Post.title.ilike(pattern),
                    Post.summary.ilike(pattern),
                    Post.id.in_(tag_posts),
                    Post.category_id.in_(category_ids),
                )
            )
            order_columns = [
                case(
                    (Post.title.ilike(pattern), 3),
                    (Post.summary.ilike(pattern), 2),
                    else_=1,
                ).desc(),
                Post.published_at.desc(),
            ]
        statement = select(Post).where(*filters)
        count_statement = select(func.count(func.distinct(Post.id))).where(*filters)
        if category:
            statement = statement.join(Category, Post.category_id == Category.id).where(
                Category.slug == category, Category.deleted_at.is_(None)
            )
            count_statement = count_statement.join(
                Category, Post.category_id == Category.id
            ).where(Category.slug == category, Category.deleted_at.is_(None))
        if tag:
            statement = (
                statement.join(PostTag, PostTag.post_id == Post.id)
                .join(Tag, Tag.id == PostTag.tag_id)
                .where(Tag.slug == tag, Tag.deleted_at.is_(None))
            )
            count_statement = (
                count_statement.join(PostTag, PostTag.post_id == Post.id)
                .join(Tag, Tag.id == PostTag.tag_id)
                .where(Tag.slug == tag, Tag.deleted_at.is_(None))
            )
        statement = (
            statement.order_by(*order_columns)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .distinct()
        )
        posts = list((await self.session.scalars(statement)).all())
        total = int((await self.session.scalar(count_statement)) or 0)
        return await self._post_dicts(posts, include_detail=include_unpublished), total

    async def get_post(self, slug: str, include_unpublished: bool = False) -> dict:
        filters = [Post.slug == slug, Post.deleted_at.is_(None)]
        if not include_unpublished:
            filters.extend(
                [
                    Post.status == "published",
                    Post.published_at.is_not(None),
                    Post.published_at <= datetime.now(UTC),
                ]
            )
        post = await self.session.scalar(select(Post).where(*filters))
        if not post:
            redirect = await self.session.scalar(
                select(Redirect).where(
                    Redirect.source_path == f"/articles/{slug}",
                    Redirect.deleted_at.is_(None),
                )
            )
            if redirect:
                raise AppError(301, "MOVED_PERMANENTLY", redirect.target_path)
            raise AppError(404, "POST_NOT_FOUND", "文章不存在。")
        return (await self._post_dicts([post]))[0]

    async def get_post_context(self, slug: str) -> dict:
        published = [
            Post.deleted_at.is_(None),
            Post.status == "published",
            Post.published_at.is_not(None),
            Post.published_at <= datetime.now(UTC),
        ]
        post = await self.session.scalar(select(Post).where(Post.slug == slug, *published))
        if not post:
            raise AppError(404, "POST_NOT_FOUND", "文章不存在。")

        previous = await self.session.scalar(
            select(Post)
            .where(
                *published,
                Post.id != post.id,
                or_(
                    Post.published_at > post.published_at,
                    and_(Post.published_at == post.published_at, Post.id > post.id),
                ),
            )
            .order_by(Post.published_at.asc(), Post.id.asc())
            .limit(1)
        )
        next_post = await self.session.scalar(
            select(Post)
            .where(
                *published,
                Post.id != post.id,
                or_(
                    Post.published_at < post.published_at,
                    and_(Post.published_at == post.published_at, Post.id < post.id),
                ),
            )
            .order_by(Post.published_at.desc(), Post.id.desc())
            .limit(1)
        )
        tag_ids = select(PostTag.tag_id).where(PostTag.post_id == post.id)
        related_ids = (
            select(PostTag.post_id, func.count(PostTag.tag_id).label("shared_tags"))
            .where(PostTag.tag_id.in_(tag_ids), PostTag.post_id != post.id)
            .group_by(PostTag.post_id)
            .subquery()
        )
        related = list(
            (
                await self.session.scalars(
                    select(Post)
                    .join(related_ids, related_ids.c.post_id == Post.id)
                    .where(*published)
                    .order_by(related_ids.c.shared_tags.desc(), Post.published_at.desc())
                    .limit(3)
                )
            ).all()
        )
        adjacent = [item for item in (previous, next_post) if item]
        adjacent_items = {
            item.id: value
            for item, value in zip(
                adjacent,
                await self._post_dicts(adjacent, include_detail=False),
                strict=True,
            )
        }
        return {
            "previous": adjacent_items.get(previous.id) if previous else None,
            "next": adjacent_items.get(next_post.id) if next_post else None,
            "related": await self._post_dicts(related, include_detail=False),
        }

    async def create_post(self, payload: PostCreate, author_id: UUID) -> dict:
        values = payload.model_dump(exclude={"tag_ids"})
        post = Post(**values, author_id=author_id)
        if post.status == "published":
            self._ensure_publishable(post)
            post.published_at = datetime.now(UTC)
        self.session.add(post)
        try:
            await self.session.flush()
            await self._replace_post_tags(post.id, payload.tag_ids)
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise AppError(409, "SLUG_CONFLICT", "文章 slug 已存在。") from exc
        await self.session.refresh(post)
        return (await self._post_dicts([post]))[0]

    async def update_post(self, post_id: UUID, payload: PostUpdate) -> dict:
        post = await self._editable_post(post_id)
        if post.version != payload.version:
            raise AppError(409, "VERSION_CONFLICT", "文章已被其他编辑更新。")
        values = payload.model_dump(exclude_unset=True, exclude={"tag_ids", "version"})
        previous_slug = post.slug
        for key, value in values.items():
            setattr(post, key, value)
        if post.status == "published":
            self._ensure_publishable(post)
            post.published_at = post.published_at or datetime.now(UTC)
        post.version += 1
        if payload.tag_ids is not None:
            await self._replace_post_tags(post.id, payload.tag_ids)
        if previous_slug != post.slug:
            self.session.add(
                Redirect(
                    source_path=f"/articles/{previous_slug}",
                    target_path=f"/articles/{post.slug}",
                    status_code=301,
                )
            )
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise AppError(409, "SLUG_CONFLICT", "文章 slug 已存在。") from exc
        await self.session.refresh(post)
        return (await self._post_dicts([post]))[0]

    async def publish_post(
        self, post_id: UUID, version: int, publish_at: datetime | None = None
    ) -> dict:
        post = await self._editable_post(post_id)
        if post.version != version:
            raise AppError(409, "VERSION_CONFLICT", "文章已被其他编辑更新。")
        self._ensure_publishable(post)
        post.status = "published"
        post.published_at = publish_at or post.published_at or datetime.now(UTC)
        post.version += 1
        await self.session.commit()
        await self.session.refresh(post)
        return (await self._post_dicts([post]))[0]

    async def soft_delete_post(self, post_id: UUID) -> None:
        post = await self._editable_post(post_id)
        post.deleted_at = datetime.now(UTC)
        post.version += 1
        await self.session.commit()

    async def restore_post(self, post_id: UUID) -> dict:
        post = await self.session.get(Post, post_id)
        if not post:
            raise AppError(404, "POST_NOT_FOUND", "文章不存在。")
        post.deleted_at = None
        post.version += 1
        await self.session.commit()
        await self.session.refresh(post)
        return (await self._post_dicts([post]))[0]

    async def list_projects(
        self,
        page: int,
        page_size: int,
        q: str | None = None,
        include_unpublished: bool = False,
        include_deleted: bool = False,
    ) -> tuple[list[dict], int]:
        filters = [] if include_deleted else [Project.deleted_at.is_(None)]
        if not include_unpublished:
            filters.extend(
                [
                    Project.is_public.is_(True),
                    Project.confidentiality_checked.is_(True),
                ]
            )
        order_columns = [
            Project.featured.desc(),
            Project.sort_order.asc(),
            Project.created_at.desc(),
        ]
        if q:
            pattern = f"%{q.strip()}%"
            tagged_projects = (
                select(ProjectTag.project_id)
                .join(Tag, Tag.id == ProjectTag.tag_id)
                .where(or_(Tag.name.ilike(pattern), Tag.slug.ilike(pattern)))
            )
            filters.append(
                or_(
                    Project.title.ilike(pattern),
                    Project.summary.ilike(pattern),
                    Project.id.in_(tagged_projects),
                )
            )
            order_columns = [
                case(
                    (Project.title.ilike(pattern), 3),
                    (Project.summary.ilike(pattern), 2),
                    else_=1,
                ).desc(),
                Project.featured.desc(),
                Project.sort_order.asc(),
            ]
        total = int(
            (await self.session.scalar(select(func.count(Project.id)).where(*filters))) or 0
        )
        projects = list(
            (
                await self.session.scalars(
                    select(Project)
                    .where(*filters)
                    .order_by(*order_columns)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            ).all()
        )
        return await self._project_dicts(
            projects,
            include_unpublished_relations=include_unpublished,
            include_detail=include_unpublished,
        ), total

    async def get_project(self, slug: str) -> dict:
        project = await self.session.scalar(
            select(Project).where(
                Project.slug == slug,
                Project.deleted_at.is_(None),
                Project.is_public.is_(True),
                Project.confidentiality_checked.is_(True),
            )
        )
        if not project:
            redirect = await self.session.scalar(
                select(Redirect).where(
                    Redirect.source_path == f"/projects/{slug}",
                    Redirect.deleted_at.is_(None),
                )
            )
            if redirect:
                raise AppError(301, "MOVED_PERMANENTLY", redirect.target_path)
            raise AppError(404, "PROJECT_NOT_FOUND", "项目不存在。")
        return (await self._project_dicts([project]))[0]

    async def create_project(self, payload: ProjectCreate, owner_id: UUID) -> dict:
        project = Project(
            **payload.model_dump(
                exclude={"tag_ids", "related_post_ids", "screenshot_media_ids"}
            ),
            owner_id=owner_id,
        )
        self._ensure_public_project(project)
        self.session.add(project)
        try:
            await self.session.flush()
            await self._replace_project_tags(project.id, payload.tag_ids)
            await self._replace_project_posts(project.id, payload.related_post_ids)
            await self._replace_project_media(project.id, payload.screenshot_media_ids)
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise AppError(409, "SLUG_CONFLICT", "项目 slug 已存在。") from exc
        await self.session.refresh(project)
        return (
            await self._project_dicts(
                [project],
                include_unpublished_relations=True,
            )
        )[0]

    async def update_project(self, project_id: UUID, payload: ProjectUpdate) -> dict:
        project = await self._editable_project(project_id)
        if project.version != payload.version:
            raise AppError(409, "VERSION_CONFLICT", "项目已被其他编辑更新。")
        previous_slug = project.slug
        values = payload.model_dump(
            exclude_unset=True,
            exclude={
                "tag_ids",
                "related_post_ids",
                "screenshot_media_ids",
                "version",
            },
        )
        for key, value in values.items():
            setattr(project, key, value)
        self._ensure_public_project(project)
        project.version += 1
        if payload.tag_ids is not None:
            await self._replace_project_tags(project.id, payload.tag_ids)
        if payload.related_post_ids is not None:
            await self._replace_project_posts(project.id, payload.related_post_ids)
        if payload.screenshot_media_ids is not None:
            await self._replace_project_media(project.id, payload.screenshot_media_ids)
        if previous_slug != project.slug:
            self.session.add(
                Redirect(
                    source_path=f"/projects/{previous_slug}",
                    target_path=f"/projects/{project.slug}",
                    status_code=301,
                )
            )
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise AppError(409, "SLUG_CONFLICT", "项目 slug 已存在。") from exc
        await self.session.refresh(project)
        return (
            await self._project_dicts(
                [project],
                include_unpublished_relations=True,
            )
        )[0]

    async def soft_delete_project(self, project_id: UUID) -> None:
        project = await self._editable_project(project_id)
        project.deleted_at = datetime.now(UTC)
        project.version += 1
        await self.session.commit()

    async def restore_project(self, project_id: UUID) -> dict:
        project = await self.session.get(Project, project_id)
        if not project:
            raise AppError(404, "PROJECT_NOT_FOUND", "项目不存在。")
        project.deleted_at = None
        project.version += 1
        await self.session.commit()
        await self.session.refresh(project)
        return (
            await self._project_dicts(
                [project],
                include_unpublished_relations=True,
            )
        )[0]

    async def _editable_post(self, post_id: UUID) -> Post:
        post = await self.session.scalar(
            select(Post)
            .where(Post.id == post_id, Post.deleted_at.is_(None))
            .with_for_update()
        )
        if not post:
            raise AppError(404, "POST_NOT_FOUND", "文章不存在。")
        return post

    async def _editable_project(self, project_id: UUID) -> Project:
        project = await self.session.scalar(
            select(Project)
            .where(Project.id == project_id, Project.deleted_at.is_(None))
            .with_for_update()
        )
        if not project:
            raise AppError(404, "PROJECT_NOT_FOUND", "项目不存在。")
        return project

    async def _replace_post_tags(self, post_id: UUID, tag_ids: Iterable[UUID]) -> None:
        await self.session.execute(delete(PostTag).where(PostTag.post_id == post_id))
        self.session.add_all([PostTag(post_id=post_id, tag_id=tag_id) for tag_id in tag_ids])

    async def _replace_project_tags(
        self, project_id: UUID, tag_ids: Iterable[UUID]
    ) -> None:
        await self.session.execute(
            delete(ProjectTag).where(ProjectTag.project_id == project_id)
        )
        self.session.add_all(
            [ProjectTag(project_id=project_id, tag_id=tag_id) for tag_id in tag_ids]
        )

    async def _replace_project_posts(
        self, project_id: UUID, post_ids: Iterable[UUID]
    ) -> None:
        await self.session.execute(
            delete(ProjectPost).where(ProjectPost.project_id == project_id)
        )
        self.session.add_all(
            [ProjectPost(project_id=project_id, post_id=post_id) for post_id in post_ids]
        )

    async def _replace_project_media(
        self, project_id: UUID, media_ids: Iterable[UUID]
    ) -> None:
        await self.session.execute(
            delete(ProjectMedia).where(ProjectMedia.project_id == project_id)
        )
        self.session.add_all(
            [
                ProjectMedia(
                    project_id=project_id,
                    media_id=media_id,
                    sort_order=index,
                )
                for index, media_id in enumerate(media_ids)
            ]
        )

    async def _post_dicts(
        self, posts: list[Post], include_detail: bool = True
    ) -> list[dict]:
        tags: dict[UUID, list[str]] = {post.id: [] for post in posts}
        tag_slugs: dict[UUID, list[str]] = {post.id: [] for post in posts}
        tag_ids: dict[UUID, list[UUID]] = {post.id: [] for post in posts}
        category_ids = {post.category_id for post in posts if post.category_id}
        categories: dict[UUID, tuple[str, str]] = {}
        cover_ids = {post.cover_media_id for post in posts if post.cover_media_id}
        covers = await self._media_dicts(cover_ids)
        if category_ids:
            rows = await self.session.execute(
                select(Category.id, Category.name, Category.slug).where(
                    Category.id.in_(category_ids), Category.deleted_at.is_(None)
                )
            )
            categories = {
                category_id: (name, slug)
                for category_id, name, slug in rows
            }
        if tags:
            rows = await self.session.execute(
                select(PostTag.post_id, Tag.id, Tag.name, Tag.slug)
                .join(Tag, Tag.id == PostTag.tag_id)
                .where(PostTag.post_id.in_(tags), Tag.deleted_at.is_(None))
                .order_by(Tag.name)
            )
            for post_id, tag_id, name, slug in rows:
                tag_ids[post_id].append(tag_id)
                tags[post_id].append(name)
                tag_slugs[post_id].append(slug)
        items = [
            {
                "id": post.id,
                "title": post.title,
                "slug": post.slug,
                "summary": post.summary,
                "category": categories.get(post.category_id, ("未分类", ""))[0],
                "category_slug": categories.get(post.category_id, ("未分类", ""))[1],
                "cover": covers.get(post.cover_media_id),
                "tags": tags[post.id],
                "tag_slugs": tag_slugs[post.id],
                "reading_time": max(1, round(len(post.content_md) / 500)),
                "series": next(
                    (tag for tag in tags[post.id] if "系列" in tag),
                    None,
                ),
                "published_at": post.published_at,
                "updated_at": post.updated_at,
            }
            for post in posts
        ]
        if include_detail:
            for item, post in zip(items, posts, strict=True):
                item.update(
                    {
                        "content_md": post.content_md,
                        "status": post.status,
                        "category_id": post.category_id,
                        "cover_media_id": post.cover_media_id,
                        "tag_ids": tag_ids[post.id],
                        "seo_title": post.seo_title,
                        "seo_description": post.seo_description,
                        "confidentiality_checked": post.confidentiality_checked,
                        "version": post.version,
                        "deleted_at": post.deleted_at,
                    }
                )
        return items

    async def _project_dicts(
        self,
        projects: list[Project],
        include_unpublished_relations: bool = False,
        include_detail: bool = True,
    ) -> list[dict]:
        tags: dict[UUID, list[str]] = {project.id: [] for project in projects}
        tag_ids: dict[UUID, list[UUID]] = {project.id: [] for project in projects}
        screenshots: dict[UUID, list[dict]] = {project.id: [] for project in projects}
        related_posts: dict[UUID, list[dict]] = {project.id: [] for project in projects}
        cover_ids = {project.cover_media_id for project in projects if project.cover_media_id}
        covers = await self._media_dicts(cover_ids)
        if tags:
            rows = await self.session.execute(
                select(ProjectTag.project_id, Tag.id, Tag.name)
                .join(Tag, Tag.id == ProjectTag.tag_id)
                .where(ProjectTag.project_id.in_(tags), Tag.deleted_at.is_(None))
                .order_by(Tag.name)
            )
            for project_id, tag_id, name in rows:
                tag_ids[project_id].append(tag_id)
                tags[project_id].append(name)
        if tags and include_detail:
            media_rows = await self.session.execute(
                select(ProjectMedia.project_id, MediaFile)
                .join(MediaFile, MediaFile.id == ProjectMedia.media_id)
                .where(
                    ProjectMedia.project_id.in_(tags),
                    MediaFile.deleted_at.is_(None),
                )
                .order_by(ProjectMedia.project_id, ProjectMedia.sort_order)
            )
            for project_id, media in media_rows:
                screenshots[project_id].append(self._media_dict(media))
            post_statement = (
                select(ProjectPost.project_id, Post)
                .join(Post, Post.id == ProjectPost.post_id)
                .where(
                    ProjectPost.project_id.in_(tags),
                    Post.deleted_at.is_(None),
                )
            )
            if not include_unpublished_relations:
                post_statement = post_statement.where(
                    Post.status == "published",
                    Post.published_at.is_not(None),
                    Post.published_at <= datetime.now(UTC),
                )
            post_rows = await self.session.execute(
                post_statement.order_by(Post.published_at.desc().nullslast())
            )
            for project_id, post in post_rows:
                related_posts[project_id].append(
                    {"id": post.id, "title": post.title, "slug": post.slug}
                )
        list_fields = (
            "id",
            "title",
            "slug",
            "summary",
            "status",
            "cover_media_id",
            "started_at",
            "ended_at",
            "featured",
            "sort_order",
            "updated_at",
        )
        detail_fields = (
            "content_md",
            "background_md",
            "problem_md",
            "role_md",
            "architecture_md",
            "features_md",
            "challenges_md",
            "solutions_md",
            "outcomes_md",
            "next_steps_md",
            "confidentiality_note",
            "repo_url",
            "demo_url",
            "is_public",
            "confidentiality_checked",
            "version",
            "deleted_at",
        )
        items = [
            {
                **{field: getattr(project, field) for field in list_fields},
                "tags": tags[project.id],
                "cover": covers.get(project.cover_media_id),
                "problem_excerpt": self._markdown_excerpt(project.problem_md),
                "role_excerpt": self._markdown_excerpt(project.role_md),
                "decision_excerpt": self._markdown_excerpt(
                    project.architecture_md or project.solutions_md
                ),
                "result_excerpt": self._markdown_excerpt(project.outcomes_md),
            }
            for project in projects
        ]
        if include_detail:
            for item, project in zip(items, projects, strict=True):
                item.update(
                    {
                        **{field: getattr(project, field) for field in detail_fields},
                        "tag_ids": tag_ids[project.id],
                        "screenshots": screenshots[project.id],
                        "screenshot_media_ids": [
                            media["id"] for media in screenshots[project.id]
                        ],
                        "related_posts": related_posts[project.id],
                        "related_post_ids": [
                            post["id"] for post in related_posts[project.id]
                        ],
                    }
                )
        return items

    @staticmethod
    def _markdown_excerpt(source: str, limit: int = 180) -> str:
        text = re.sub(r"```.*?```", " ", source, flags=re.DOTALL)
        text = re.sub(r"[#>*_`\[\]()]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text if len(text) <= limit else f"{text[: limit - 1].rstrip()}…"

    async def _media_dicts(self, media_ids: set[UUID]) -> dict[UUID, dict]:
        if not media_ids:
            return {}
        media = list(
            (
                await self.session.scalars(
                    select(MediaFile).where(
                        MediaFile.id.in_(media_ids),
                        MediaFile.deleted_at.is_(None),
                    )
                )
            ).all()
        )
        return {item.id: self._media_dict(item) for item in media}

    @staticmethod
    def _media_dict(media: MediaFile) -> dict:
        return {
            "id": media.id,
            "storage_key": media.storage_key,
            "alt_text": media.alt_text,
            "width": media.width,
            "height": media.height,
        }

    @staticmethod
    def _ensure_publishable(post: Post) -> None:
        if not post.confidentiality_checked:
            raise AppError(
                409,
                "CONFIDENTIALITY_CHECK_REQUIRED",
                "发布前必须完成保密检查。",
            )

    @staticmethod
    def _ensure_public_project(project: Project) -> None:
        if project.is_public and not project.confidentiality_checked:
            raise AppError(
                409,
                "CONFIDENTIALITY_CHECK_REQUIRED",
                "项目公开前必须完成保密检查。",
            )
