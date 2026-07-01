"""create lyrics learning artifacts

Revision ID: 20260629_0001
Revises:
Create Date: 2026-06-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260629_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "lyrics_learning_artifacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("song_title", sa.Text(), nullable=False),
        sa.Column("artist", sa.Text(), nullable=False),
        sa.Column("learning_goal", sa.Text(), nullable=False),
        sa.Column(
            "source_type",
            sa.Text(),
            server_default="user_provided",
            nullable=False,
        ),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("lyrics_text", sa.Text(), nullable=True),
        sa.Column("study_notes", sa.Text(), nullable=True),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("provider_model", sa.Text(), nullable=True),
        sa.Column("provider_profile", sa.Text(), nullable=False),
        sa.Column("provider_mode", sa.Text(), nullable=False),
        sa.Column("prompt_contract_version", sa.Text(), nullable=False),
        sa.Column(
            "agent_output_present",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
        sa.Column(
            "pronunciation_notes",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "sing_along_notes",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "review_cards",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("generation_error", sa.Text(), nullable=True),
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
        sa.CheckConstraint(
            "char_length(song_title) > 0",
            name="ck_artifact_song_title",
        ),
        sa.CheckConstraint("char_length(artist) > 0", name="ck_artifact_artist"),
        sa.CheckConstraint(
            "char_length(learning_goal) > 0",
            name="ck_artifact_learning_goal",
        ),
        sa.CheckConstraint(
            "source_type = 'user_provided'",
            name="ck_artifact_source_type",
        ),
        sa.CheckConstraint(
            "status in ('pending_agent_generation', 'generated', 'needs_review')",
            name="ck_artifact_status",
        ),
        sa.CheckConstraint(
            "jsonb_typeof(pronunciation_notes) = 'array'",
            name="ck_artifact_pronunciation_notes_array",
        ),
        sa.CheckConstraint(
            "jsonb_typeof(sing_along_notes) = 'array'",
            name="ck_artifact_sing_along_notes_array",
        ),
        sa.CheckConstraint(
            "jsonb_typeof(review_cards) = 'array'",
            name="ck_artifact_review_cards_array",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_lyrics_learning_artifacts_updated_at",
        "lyrics_learning_artifacts",
        ["updated_at"],
    )
    op.create_table(
        "lyrics_learning_line_cards",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("artifact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("line_number", sa.Integer(), nullable=False),
        sa.Column("original_text", sa.Text(), nullable=False),
        sa.Column("romaji", sa.Text(), nullable=True),
        sa.Column("approximate_chinese_pronunciation", sa.Text(), nullable=True),
        sa.Column("meaning", sa.Text(), nullable=True),
        sa.Column(
            "pronunciation_notes",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "sing_along_notes",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("confidence", sa.Numeric(4, 3), nullable=True),
        sa.Column(
            "needs_review",
            sa.Boolean(),
            server_default="true",
            nullable=False,
        ),
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
        sa.CheckConstraint("confidence is null or confidence >= 0", name="ck_conf_min"),
        sa.CheckConstraint("confidence is null or confidence <= 1", name="ck_conf_max"),
        sa.CheckConstraint("line_number >= 1", name="ck_line_card_line_number"),
        sa.CheckConstraint(
            "jsonb_typeof(pronunciation_notes) = 'array'",
            name="ck_line_card_pronunciation_notes_array",
        ),
        sa.CheckConstraint(
            "jsonb_typeof(sing_along_notes) = 'array'",
            name="ck_line_card_sing_along_notes_array",
        ),
        sa.ForeignKeyConstraint(
            ["artifact_id"],
            ["lyrics_learning_artifacts.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "artifact_id",
            "line_number",
            name="uq_line_card_artifact_line_number",
        ),
    )
    op.create_index(
        "ix_lyrics_learning_line_cards_artifact_id",
        "lyrics_learning_line_cards",
        ["artifact_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_lyrics_learning_line_cards_artifact_id",
        table_name="lyrics_learning_line_cards",
    )
    op.drop_table("lyrics_learning_line_cards")
    op.drop_index(
        "ix_lyrics_learning_artifacts_updated_at",
        table_name="lyrics_learning_artifacts",
    )
    op.drop_table("lyrics_learning_artifacts")
