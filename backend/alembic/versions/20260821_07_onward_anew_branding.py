"""Apply the 从头越.blog public branding.

Revision ID: 20260821_07
Revises: 20260802_06
"""

from alembic import op

revision = "20260821_07"
down_revision = "20260802_06"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE site_settings
        SET value_json = '"从头越.blog"'::jsonb
        WHERE key = 'public.site_name'
          AND value_json = '"从头越.log"'::jsonb
        """
    )
    op.execute(
        """
        UPDATE site_settings
        SET value_json = '"从头越"'::jsonb
        WHERE key = 'public.author_name'
          AND value_json = '"林序"'::jsonb
        """
    )
    op.execute(
        """
        UPDATE site_settings
        SET value_json = '"从头越.blog：记录嵌入式通信测试、自动化工具、软件架构与工程实践的个人技术博客。"'::jsonb
        WHERE key = 'public.seo_description'
          AND value_json = '"从头越.log：记录嵌入式通信测试、自动化工具、软件架构与工程实践的个人技术博客。"'::jsonb
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE site_settings
        SET value_json = '"从头越.log"'::jsonb
        WHERE key = 'public.site_name'
          AND value_json = '"从头越.blog"'::jsonb
        """
    )
    op.execute(
        """
        UPDATE site_settings
        SET value_json = '"林序"'::jsonb
        WHERE key = 'public.author_name'
          AND value_json = '"从头越"'::jsonb
        """
    )
    op.execute(
        """
        UPDATE site_settings
        SET value_json = '"从头越.log：记录嵌入式通信测试、自动化工具、软件架构与工程实践的个人技术博客。"'::jsonb
        WHERE key = 'public.seo_description'
          AND value_json = '"从头越.blog：记录嵌入式通信测试、自动化工具、软件架构与工程实践的个人技术博客。"'::jsonb
        """
    )
