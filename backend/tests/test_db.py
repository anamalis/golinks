from datetime import UTC, datetime

import pytest
from sqlalchemy.dialects import sqlite

from golinks.db import UTCDateTime


def test_aware_datetimes_are_stored_as_utc() -> None:
    value = datetime.fromisoformat("2026-10-23T12:00:00+02:00")

    stored = UTCDateTime().process_bind_param(value, sqlite.dialect())

    assert stored == datetime(2026, 10, 23, 10, 0)


def test_naive_datetimes_are_rejected() -> None:
    with pytest.raises(ValueError, match="timezone"):
        UTCDateTime().process_bind_param(datetime(2026, 10, 23, 12, 0), sqlite.dialect())


def test_stored_datetimes_come_back_as_utc() -> None:
    loaded = UTCDateTime().process_result_value(datetime(2026, 10, 23, 10, 0), sqlite.dialect())

    assert loaded == datetime(2026, 10, 23, 10, 0, tzinfo=UTC)
