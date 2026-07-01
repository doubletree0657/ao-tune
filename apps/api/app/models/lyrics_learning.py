from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class LyricsLearningArtifact(Base):
    __tablename__ = "lyrics_learning_artifacts"
    __table_args__ = (
        CheckConstraint("char_length(song_title) > 0", name="ck_artifact_song_title"),
        CheckConstraint("char_length(artist) > 0", name="ck_artifact_artist"),
        CheckConstraint(
            "char_length(learning_goal) > 0",
            name="ck_artifact_learning_goal",
        ),
        CheckConstraint(
            "source_type = 'user_provided'",
            name="ck_artifact_source_type",
        ),
        CheckConstraint(
            "status in ('pending_agent_generation', 'generated', 'needs_review')",
            name="ck_artifact_status",
        ),
        CheckConstraint(
            "jsonb_typeof(pronunciation_notes) = 'array'",
            name="ck_artifact_pronunciation_notes_array",
        ),
        CheckConstraint(
            "jsonb_typeof(sing_along_notes) = 'array'",
            name="ck_artifact_sing_along_notes_array",
        ),
        CheckConstraint(
            "jsonb_typeof(review_cards) = 'array'",
            name="ck_artifact_review_cards_array",
        ),
        Index("ix_lyrics_learning_artifacts_updated_at", "updated_at"),
    )

    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    song_title: Mapped[str] = mapped_column(Text)
    artist: Mapped[str] = mapped_column(Text)
    learning_goal: Mapped[str] = mapped_column(Text)
    source_type: Mapped[str] = mapped_column(
        Text,
        default="user_provided",
        server_default="user_provided",
    )
    status: Mapped[str] = mapped_column(Text)
    lyrics_text: Mapped[str | None] = mapped_column(Text)
    study_notes: Mapped[str | None] = mapped_column(Text)
    provider: Mapped[str] = mapped_column(Text)
    provider_model: Mapped[str | None] = mapped_column(Text)
    provider_profile: Mapped[str] = mapped_column(Text)
    provider_mode: Mapped[str] = mapped_column(Text)
    prompt_contract_version: Mapped[str] = mapped_column(Text)
    agent_output_present: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
    )
    pronunciation_notes: Mapped[list[str]] = mapped_column(
        JSONB,
        default=list,
        server_default=text("'[]'::jsonb"),
    )
    sing_along_notes: Mapped[list[str]] = mapped_column(
        JSONB,
        default=list,
        server_default=text("'[]'::jsonb"),
    )
    review_cards: Mapped[list[str]] = mapped_column(
        JSONB,
        default=list,
        server_default=text("'[]'::jsonb"),
    )
    generation_error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    line_cards: Mapped[list["LyricsLearningLineCard"]] = relationship(
        back_populates="artifact",
        cascade="all, delete-orphan",
        order_by="LyricsLearningLineCard.line_number",
    )


class LyricsLearningLineCard(Base):
    __tablename__ = "lyrics_learning_line_cards"
    __table_args__ = (
        CheckConstraint("line_number >= 1", name="ck_line_card_line_number"),
        CheckConstraint("confidence is null or confidence >= 0", name="ck_conf_min"),
        CheckConstraint("confidence is null or confidence <= 1", name="ck_conf_max"),
        CheckConstraint(
            "jsonb_typeof(pronunciation_notes) = 'array'",
            name="ck_line_card_pronunciation_notes_array",
        ),
        CheckConstraint(
            "jsonb_typeof(sing_along_notes) = 'array'",
            name="ck_line_card_sing_along_notes_array",
        ),
        UniqueConstraint(
            "artifact_id",
            "line_number",
            name="uq_line_card_artifact_line_number",
        ),
        Index("ix_lyrics_learning_line_cards_artifact_id", "artifact_id"),
    )

    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    artifact_id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        ForeignKey("lyrics_learning_artifacts.id", ondelete="CASCADE"),
    )
    line_number: Mapped[int] = mapped_column(Integer)
    original_text: Mapped[str] = mapped_column(Text)
    romaji: Mapped[str | None] = mapped_column(Text)
    approximate_chinese_pronunciation: Mapped[str | None] = mapped_column(Text)
    meaning: Mapped[str | None] = mapped_column(Text)
    pronunciation_notes: Mapped[list[str]] = mapped_column(
        JSONB,
        default=list,
        server_default=text("'[]'::jsonb"),
    )
    sing_along_notes: Mapped[list[str]] = mapped_column(
        JSONB,
        default=list,
        server_default=text("'[]'::jsonb"),
    )
    confidence: Mapped[float | None] = mapped_column(Numeric(4, 3))
    needs_review: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="true",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    artifact: Mapped[LyricsLearningArtifact] = relationship(
        back_populates="line_cards",
    )
