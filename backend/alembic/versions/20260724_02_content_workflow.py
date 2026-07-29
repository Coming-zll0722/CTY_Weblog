"""Add content workflow, redirects, backups, and project relations.

Revision ID: 20260724_02
Revises: 20260723_01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260724_02"
down_revision = "20260723_01"
branch_labels = None
depends_on = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    ]


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.add_column(
        "users", sa.Column("token_version", sa.Integer(), server_default="1", nullable=False)
    )
    op.add_column(
        "posts",
        sa.Column(
            "confidentiality_checked",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
    )
    op.add_column(
        "posts", sa.Column("version", sa.Integer(), server_default="1", nullable=False)
    )
    for name in (
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
    ):
        op.add_column(
            "projects", sa.Column(name, sa.Text(), server_default="", nullable=False)
        )
    op.add_column(
        "projects", sa.Column("version", sa.Integer(), server_default="1", nullable=False)
    )
    op.add_column(
        "projects",
        sa.Column("is_public", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.create_index("ix_projects_is_public", "projects", ["is_public"])
    op.create_table(
        "project_posts",
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "post_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("posts.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )
    op.create_index("ix_project_posts_post_id", "project_posts", ["post_id"])
    op.create_table(
        "redirects",
        *timestamps(),
        sa.Column("source_path", sa.String(500), nullable=False),
        sa.Column("target_path", sa.String(500), nullable=False),
        sa.Column("status_code", sa.Integer(), server_default="301", nullable=False),
        sa.UniqueConstraint("source_path", name="uq_redirects_source_path"),
    )
    op.create_index("ix_redirects_source_path", "redirects", ["source_path"])
    op.create_table(
        "backups",
        *timestamps(),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("storage_key", sa.String(500)),
        sa.Column("size_bytes", sa.BigInteger()),
        sa.Column("checksum", sa.String(64)),
        sa.Column(
            "started_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("error_message", sa.Text()),
    )
    op.create_index("ix_backups_status", "backups", ["status"])
    op.create_index(
        "ix_posts_title_trgm",
        "posts",
        ["title"],
        postgresql_using="gin",
        postgresql_ops={"title": "gin_trgm_ops"},
    )
    op.create_index(
        "ix_projects_title_trgm",
        "projects",
        ["title"],
        postgresql_using="gin",
        postgresql_ops={"title": "gin_trgm_ops"},
    )


def downgrade() -> None:
    op.drop_index("ix_projects_title_trgm", table_name="projects")
    op.drop_index("ix_posts_title_trgm", table_name="posts")
    op.drop_table("backups")
    op.drop_table("redirects")
    op.drop_table("project_posts")
    op.drop_index("ix_projects_is_public", table_name="projects")
    op.drop_column("projects", "is_public")
    op.drop_column("projects", "version")
    for name in reversed(
        (
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
        )
    ):
        op.drop_column("projects", name)
    op.drop_column("posts", "version")
    op.drop_column("posts", "confidentiality_checked")
    op.drop_column("users", "token_version")
