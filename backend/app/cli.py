import argparse
import asyncio

from sqlalchemy import select

from app.content_library import SeedResult, seed_content_library
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import SiteSetting, User
from app.repositories.management import PUBLIC_SETTING_DEFAULTS


async def create_admin() -> User:
    settings = get_settings()
    if not settings.initial_admin_email or not settings.initial_admin_password:
        raise SystemExit(
            "Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD before creating the administrator."
        )
    if len(settings.initial_admin_password) < 12:
        raise SystemExit("INITIAL_ADMIN_PASSWORD must contain at least 12 characters.")
    async with SessionLocal() as session:
        user = await session.scalar(
            select(User).where(User.email == settings.initial_admin_email.lower())
        )
        if not user:
            user = User(
                email=settings.initial_admin_email.lower(),
                password_hash=hash_password(settings.initial_admin_password),
                display_name="站点管理员",
                role=settings.initial_admin_role,
                is_active=True,
            )
            session.add(user)
            await session.flush()
            await session.commit()
        return user


async def seed() -> None:
    await create_admin()
    settings = get_settings()
    async with SessionLocal() as session:
        user = await session.scalar(
            select(User).where(User.email == settings.initial_admin_email.lower())
        )
        if user is None:
            raise SystemExit("Administrator initialization did not complete.")
        result = await seed_content_library(session, user.id)
        for key, value in PUBLIC_SETTING_DEFAULTS.items():
            if not await session.scalar(select(SiteSetting.id).where(SiteSetting.key == key)):
                session.add(
                    SiteSetting(
                        key=key,
                        value_json=value,
                        is_public=True,
                        updated_by=user.id,
                    )
                )
        await session.commit()
        _print_seed_result(result)


async def seed_content() -> None:
    async with SessionLocal() as session:
        user = await session.scalar(
            select(User)
            .where(User.is_active.is_(True), User.role.in_(("admin", "super_admin")))
            .order_by(User.created_at.asc())
        )
        if user is None:
            raise SystemExit("Create an active administrator before importing content.")
        result = await seed_content_library(session, user.id)
        _print_seed_result(result)


def _print_seed_result(result: SeedResult) -> None:
    print(
        "Content import complete: "
        f"categories={result.categories_created}, "
        f"tags={result.tags_created}, "
        f"posts={result.posts_created}, "
        f"projects={result.projects_created}, "
        f"upgraded={result.projects_upgraded}, "
        f"timelines={result.timelines_created}."
    )


def main() -> None:
    parser = argparse.ArgumentParser(prog="cty-log")
    parser.add_argument("command", choices=["create-admin", "seed", "seed-content"])
    args = parser.parse_args()
    if args.command == "create-admin":
        asyncio.run(create_admin())
    elif args.command == "seed":
        asyncio.run(seed())
    elif args.command == "seed-content":
        asyncio.run(seed_content())


if __name__ == "__main__":
    main()
