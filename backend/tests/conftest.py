from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from golinks.main import create_app


@pytest.fixture
def client(tmp_path: Path) -> Iterator[TestClient]:
    app = create_app(db_url=f"sqlite:///{tmp_path / 'test.db'}")
    # Entering the client runs the lifespan, which creates the tables.
    with TestClient(app, follow_redirects=False) as client:
        yield client
