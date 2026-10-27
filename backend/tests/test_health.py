from fastapi.testclient import TestClient

from golinks.main import create_app


def test_health() -> None:
    client = TestClient(create_app())

    response = client.get("/_/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
