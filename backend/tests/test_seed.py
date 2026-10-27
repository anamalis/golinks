from pathlib import Path

from sqlalchemy.orm import Session

from golinks.db import create_db_engine
from golinks.repository import LinkRepository
from golinks.seed import EXAMPLE_LINKS, seed


def test_seed_is_idempotent(tmp_path: Path) -> None:
    engine = create_db_engine(f"sqlite:///{tmp_path / 'test.db'}")
    with Session(engine) as session:
        repository = LinkRepository(session)

        assert sorted(seed(repository)) == sorted(EXAMPLE_LINKS)
        assert seed(repository) == []
        assert len(repository.list()) == len(EXAMPLE_LINKS)
    engine.dispose()
