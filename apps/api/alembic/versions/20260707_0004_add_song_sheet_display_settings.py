"""add song sheet display settings

Revision ID: 20260707_0004
Revises: 20260706_0003
Create Date: 2026-07-07
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260707_0004"
down_revision: str | None = "20260706_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        update application_settings
        set settings = settings || jsonb_build_object(
            'lyricsLearning',
            coalesce(settings->'lyricsLearning', '{}'::jsonb)
            || jsonb_build_object(
                'songSheet',
                coalesce(settings->'lyricsLearning'->'songSheet', '{}'::jsonb)
                || jsonb_build_object(
                    'originalTextSize',
                    coalesce(
                        settings#>'{lyricsLearning,songSheet,originalTextSize}',
                        '30'::jsonb
                    ),
                    'layoutMode',
                    coalesce(
                        settings#>'{lyricsLearning,songSheet,layoutMode}',
                        '"continuous"'::jsonb
                    )
                )
            )
        )
        where id = 1
        """
    )


def downgrade() -> None:
    op.execute(
        """
        update application_settings
        set settings =
            settings
            #- '{lyricsLearning,songSheet,originalTextSize}'
            #- '{lyricsLearning,songSheet,layoutMode}'
        where id = 1
        """
    )
