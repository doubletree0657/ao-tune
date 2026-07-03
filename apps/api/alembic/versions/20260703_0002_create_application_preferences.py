"""create application preferences

Revision ID: 20260703_0002
Revises: 20260629_0001
Create Date: 2026-07-03
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260703_0002"
down_revision: str | None = "20260629_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "application_preferences",
        sa.Column("id", sa.SmallInteger(), nullable=False),
        sa.Column("theme", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("id = 1", name="ck_application_preferences_singleton"),
        sa.CheckConstraint(
            "theme in ('light', 'black', 'midnight', 'sky')",
            name="ck_application_preferences_theme",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(
        sa.text(
            "insert into application_preferences (id, theme) "
            "values (1, 'light')"
        )
    )


def downgrade() -> None:
    op.drop_table("application_preferences")
