"""Require confidentiality review before a project becomes public.

Revision ID: 20260728_04
Revises: 20260724_03
"""

from alembic import op
import sqlalchemy as sa

revision = "20260728_04"
down_revision = "20260724_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column(
            "confidentiality_checked",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
    )
    # Existing records require an explicit new review before returning to the
    # public site. No content or project data is removed.
    op.execute("UPDATE projects SET is_public = false WHERE is_public = true")
    op.create_check_constraint(
        "ck_projects_public_requires_confidentiality_review",
        "projects",
        "NOT is_public OR confidentiality_checked",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_projects_public_requires_confidentiality_review",
        "projects",
        type_="check",
    )
    op.drop_column("projects", "confidentiality_checked")
