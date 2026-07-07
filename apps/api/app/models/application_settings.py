from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, SmallInteger, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ApplicationSettings(Base):
    __tablename__ = "application_settings"
    __table_args__ = (
        CheckConstraint(
            "id = 1",
            name="ck_application_settings_singleton",
        ),
        CheckConstraint(
            "jsonb_typeof(settings) = 'object'",
            name="ck_application_settings_settings_object",
        ),
    )

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    settings: Mapped[dict] = mapped_column(
        JSONB,
        server_default=text(
            """'{"theme":"light","lyricsLearning":{"songSheet":{"showRomaji":true,"showTranslation":true}}}'::jsonb"""
        ),
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
