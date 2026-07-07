"""migrate application preferences to settings

Revision ID: 20260706_0003
Revises: 20260703_0002
Create Date: 2026-07-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260706_0003"
down_revision: str | None = "20260703_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.rename_table("application_preferences", "application_settings")
    op.execute(
        "alter table application_settings "
        "rename constraint application_preferences_pkey "
        "to application_settings_pkey"
    )
    op.execute(
        "alter table application_settings "
        "rename constraint ck_application_preferences_singleton "
        "to ck_application_settings_singleton"
    )

    op.add_column(
        "application_settings",
        sa.Column("settings", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.execute(
        "update application_settings "
        "set settings = jsonb_build_object("
        "'theme', theme, "
        "'lyricsLearning', jsonb_build_object("
        "'songSheet', jsonb_build_object("
        "'showRomaji', true, "
        "'showTranslation', true"
        ")"
        ")"
        ") "
        "where id = 1"
    )
    op.alter_column("application_settings", "settings", nullable=False)
    op.drop_constraint(
        "ck_application_preferences_theme",
        "application_settings",
        type_="check",
    )
    op.drop_column("application_settings", "theme")
    op.create_check_constraint(
        "ck_application_settings_settings_object",
        "application_settings",
        "jsonb_typeof(settings) = 'object'",
    )


def downgrade() -> None:
    op.add_column(
        "application_settings",
        sa.Column("theme", sa.Text(), nullable=True),
    )
    op.execute(
        sa.text(
            "update application_settings "
            "set theme = case "
            "when settings->>'theme' in ('light', 'black', 'midnight', 'sky') "
            "then settings->>'theme' "
            "else 'light' "
            "end "
            "where id = 1"
        )
    )
    op.alter_column("application_settings", "theme", nullable=False)
    op.create_check_constraint(
        "ck_application_preferences_theme",
        "application_settings",
        "theme in ('light', 'black', 'midnight', 'sky')",
    )
    op.drop_constraint(
        "ck_application_settings_settings_object",
        "application_settings",
        type_="check",
    )
    op.drop_column("application_settings", "settings")
    op.execute(
        "alter table application_settings "
        "rename constraint ck_application_settings_singleton "
        "to ck_application_preferences_singleton"
    )
    op.execute(
        "alter table application_settings "
        "rename constraint application_settings_pkey "
        "to application_preferences_pkey"
    )
    op.rename_table("application_settings", "application_preferences")
