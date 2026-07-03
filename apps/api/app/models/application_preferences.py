from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, SmallInteger, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ApplicationPreferences(Base):
    __tablename__ = "application_preferences"
    __table_args__ = (
        CheckConstraint("id = 1", name="ck_application_preferences_singleton"),
        CheckConstraint(
            "theme in ('light', 'black', 'midnight', 'sky')",
            name="ck_application_preferences_theme",
        ),
    )

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    theme: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
