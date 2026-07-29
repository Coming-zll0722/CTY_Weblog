"""Update legacy default branding to 从头越.log.

Revision ID: 20260729_05
Revises: 20260728_04
"""

from alembic import op

revision = "20260729_05"
down_revision = "20260728_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE site_settings
        SET value_json = '"从头越.log"'::jsonb
        WHERE key = 'public.site_name'
          AND value_json IN (
            '"林序 · 工程笔记"'::jsonb,
            '"边界工程志"'::jsonb
          )
        """
    )
    op.execute(
        """
        UPDATE site_settings
        SET value_json = '"LOG"'::jsonb
        WHERE key = 'public.brand_mark'
          AND value_json IN ('"LX"'::jsonb, '"BND"'::jsonb)
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE site_settings
        SET value_json = '"林序 · 工程笔记"'::jsonb
        WHERE key = 'public.site_name'
          AND value_json = '"从头越.log"'::jsonb
        """
    )
    op.execute(
        """
        UPDATE site_settings
        SET value_json = '"LX"'::jsonb
        WHERE key = 'public.brand_mark'
          AND value_json = '"LOG"'::jsonb
        """
    )
