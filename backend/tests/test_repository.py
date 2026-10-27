from collections.abc import Iterator
from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from golinks.db import create_db_engine
from golinks.repository import LinkAlreadyExistsError, LinkRepository


@pytest.fixture
def repository(tmp_path: Path) -> Iterator[LinkRepository]:
    engine = create_db_engine(f"sqlite:///{tmp_path / 'test.db'}")
    with Session(engine, expire_on_commit=False) as session:
        yield LinkRepository(session)
    engine.dispose()


def test_create_and_get(repository: LinkRepository) -> None:
    created = repository.create("docs", "https://docs.example.com/")

    fetched = repository.get("docs")

    assert fetched is not None
    assert fetched.destination_url == "https://docs.example.com/"
    assert fetched.created_at == created.created_at
    assert fetched.created_at.tzinfo is not None


def test_get_missing_returns_none(repository: LinkRepository) -> None:
    assert repository.get("missing") is None


def test_create_duplicate_raises(repository: LinkRepository) -> None:
    repository.create("docs", "https://docs.example.com/")

    with pytest.raises(LinkAlreadyExistsError):
        repository.create("docs", "https://other.example.com/")

    # The session is still usable after the failed insert.
    assert [link.name for link in repository.list()] == ["docs"]


def test_list_is_sorted_by_name(repository: LinkRepository) -> None:
    repository.create("github", "https://github.com/")
    repository.create("docs", "https://docs.example.com/")

    assert [link.name for link in repository.list()] == ["docs", "github"]


def test_update_destination(repository: LinkRepository) -> None:
    created = repository.create("docs", "https://docs.example.com/")
    created_at = created.created_at

    updated = repository.update_destination("docs", "https://new.example.com/")

    assert updated is not None
    assert updated.destination_url == "https://new.example.com/"
    assert updated.created_at == created_at
    assert updated.updated_at >= created_at


def test_update_missing_returns_none(repository: LinkRepository) -> None:
    assert repository.update_destination("missing", "https://example.com/") is None


def test_delete(repository: LinkRepository) -> None:
    repository.create("docs", "https://docs.example.com/")

    assert repository.delete("docs") is True
    assert repository.get("docs") is None
    assert repository.delete("docs") is False
