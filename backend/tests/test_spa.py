from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from golinks.main import create_app
from golinks.spa import dist_dir_from_env

INDEX_HTML = "<!doctype html><title>Go Links</title>"


@pytest.fixture
def spa_client(tmp_path: Path) -> Iterator[TestClient]:
    dist = tmp_path / "dist"
    (dist / "_" / "assets").mkdir(parents=True)
    (dist / "index.html").write_text(INDEX_HTML)
    (dist / "_" / "assets" / "app.js").write_text("console.log('go')")

    app = create_app(db_url=f"sqlite:///{tmp_path / 'test.db'}", spa_dist_dir=dist)
    with TestClient(app, follow_redirects=False) as client:
        client.post(
            "/_/api/links", json={"name": "standup", "destination_url": "https://example.com"}
        )
        yield client


@pytest.mark.parametrize("path", ["/", "/?name=new-thing", "/_/links/standup", "/_/unknown"])
def test_app_paths_serve_the_spa(spa_client: TestClient, path: str) -> None:
    response = spa_client.get(path)

    assert response.status_code == 200
    assert response.text == INDEX_HTML


def test_assets_are_served(spa_client: TestClient) -> None:
    response = spa_client.get("/_/assets/app.js")

    assert response.status_code == 200
    assert "javascript" in response.headers["content-type"]


@pytest.mark.parametrize("path", ["/_/assets/missing.js", "/_/api/unknown"])
def test_missing_app_resources_are_not_found(spa_client: TestClient, path: str) -> None:
    response = spa_client.get(path)

    assert response.status_code == 404
    assert response.headers["content-type"] == "application/json"


def test_go_links_still_resolve(spa_client: TestClient) -> None:
    assert spa_client.get("/standup").headers["location"] == "https://example.com/"


def test_spa_is_not_served_unless_asked_for(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / "index.html").write_text(INDEX_HTML)
    monkeypatch.delenv("SERVE_SPA", raising=False)

    assert dist_dir_from_env(tmp_path) is None


def test_spa_is_served_when_asked_for(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    (tmp_path / "index.html").write_text(INDEX_HTML)
    monkeypatch.setenv("SERVE_SPA", "1")

    assert dist_dir_from_env(tmp_path) == tmp_path


def test_asking_for_a_missing_build_fails_loudly(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("SERVE_SPA", "1")

    with pytest.raises(RuntimeError, match="make build"):
        dist_dir_from_env(tmp_path)
