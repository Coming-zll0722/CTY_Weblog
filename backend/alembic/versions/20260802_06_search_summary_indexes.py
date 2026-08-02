"""Add trigram indexes for weighted public search fields.

Revision ID: 20260802_06
Revises: 20260729_05
"""

from alembic import op

revision = "20260802_06"
down_revision = "20260729_05"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_posts_summary_trgm",
        "posts",
        ["summary"],
        postgresql_using="gin",
        postgresql_ops={"summary": "gin_trgm_ops"},
    )
    op.create_index(
        "ix_projects_summary_trgm",
        "projects",
        ["summary"],
        postgresql_using="gin",
        postgresql_ops={"summary": "gin_trgm_ops"},
    )


def downgrade() -> None:
    op.drop_index("ix_projects_summary_trgm", table_name="projects")
    op.drop_index("ix_posts_summary_trgm", table_name="posts")
