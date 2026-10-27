from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from golinks.main import create_app

DESTINATION = "https://meet.example.com/standup"


@pytest.fixture(autouse=True)
def standup(client: TestClient) -> None:
    client.post("/_/api/links", json={"name": "standup", "destination_url": DESTINATION})


# `%2F` is how the browser extension forwards a slash typed into a search (`go/standup/`).
@pytest.mark.parametrize(
    "path", ["/standup", "/Standup", "/STANDUP/", "/standup/?ref=chat", "/Standup%2F"]
)
def test_known_name_redirects_temporarily(client: TestClient, path: str) -> None:
    response = client.get(path)

    assert response.status_code == 302
    # Exact match also proves the query string is dropped, not forwarded.
    assert response.headers["location"] == DESTINATION


def test_head_resolves_too(client: TestClient) -> None:
    assert client.head("/standup").status_code == 302


def test_unknown_name_redirects_to_create_form(client: TestClient) -> None:
    response = client.get("/New-Thing")

    assert response.status_code == 302
    assert response.headers["location"] == "/?name=new-thing"


def test_unknown_name_uses_frontend_url(tmp_path: Path) -> None:
    app = create_app(
        db_url=f"sqlite:///{tmp_path / 'test.db'}", frontend_url="http://localhost:5173/"
    )
    with TestClient(app, follow_redirects=False) as client:
        response = client.get("/new-thing")

    assert response.headers["location"] == "http://localhost:5173/?name=new-thing"


@pytest.mark.parametrize(
    "path",
    [
        "/standup/extra",  # reserved for future parameterized links
        "/standup%2Fextra",
        "/standup//",
        "/favicon.ico",  # not a valid Name shape
        "/_/unknown",  # app namespace (ADR-0001)
        "/",
    ],
)
def test_unresolvable_paths_are_not_found(client: TestClient, path: str) -> None:
    assert client.get(path).status_code == 404


def test_app_routes_win_over_resolution(client: TestClient) -> None:
    assert client.get("/_/api/health").json() == {"status": "ok"}
