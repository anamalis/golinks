import os
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import DateTime, Engine, String, create_engine
from sqlalchemy.engine import Dialect, make_url
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator

from golinks.domain import DESTINATION_URL_MAX_LENGTH, NAME_MAX_LENGTH

DEFAULT_DATABASE_PATH = Path(__file__).resolve().parents[2] / "data" / "golinks.db"


def database_url() -> str:
    return os.environ.get("DATABASE_URL", f"sqlite:///{DEFAULT_DATABASE_PATH}")


def utcnow() -> datetime:
    return datetime.now(UTC)


class UTCDateTime(TypeDecorator[datetime]):
    """Timezone-aware UTC datetimes, also on SQLite (which drops the offset on storage)."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        # astimezone() would read a naive value as local time and silently shift it.
        if value.tzinfo is None:
            raise ValueError(f"Expected a timezone-aware datetime, got {value!r}")
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        return value.replace(tzinfo=UTC) if value is not None else None


class Base(DeclarativeBase):
    pass


class Link(Base):
    __tablename__ = "links"

    # Stored already normalized (lowercase), so a plain unique primary key enforces uniqueness.
    name: Mapped[str] = mapped_column(String(NAME_MAX_LENGTH), primary_key=True)
    destination_url: Mapped[str] = mapped_column(String(DESTINATION_URL_MAX_LENGTH))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)


def create_db_engine(url: str) -> Engine:
    parsed = make_url(url)
    if parsed.get_backend_name() == "sqlite" and parsed.database not in (None, "", ":memory:"):
        Path(parsed.database).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(url)
    # Tables are created on startup; Alembic migrations are deferred.
    Base.metadata.create_all(engine)
    return engine
