from fastapi.testclient import TestClient

LINKS = "/_/api/links"


def create(client: TestClient, name: str, url: str = "https://example.com/") -> None:
    response = client.post(LINKS, json={"name": name, "destination_url": url})
    assert response.status_code == 201, response.text


def test_link_lifecycle(client: TestClient) -> None:
    response = client.post(
        LINKS, json={"name": "Standup", "destination_url": "https://meet.example.com/a"}
    )
    assert response.status_code == 201
    created = response.json()
    assert created["name"] == "standup"
    assert created["destination_url"] == "https://meet.example.com/a"

    assert client.get(f"{LINKS}/standup").json() == created
    assert client.get(LINKS).json() == [created]

    response = client.get("/standup")
    assert response.status_code == 302
    assert response.headers["location"] == "https://meet.example.com/a"

    response = client.patch(
        f"{LINKS}/standup", json={"destination_url": "https://meet.example.com/b"}
    )
    assert response.status_code == 200
    assert response.json()["destination_url"] == "https://meet.example.com/b"
    assert response.json()["created_at"] == created["created_at"]

    assert client.get("/standup").headers["location"] == "https://meet.example.com/b"

    assert client.delete(f"{LINKS}/standup").status_code == 204
    assert client.get(f"{LINKS}/standup").status_code == 404


def test_create_duplicate_is_conflict(client: TestClient) -> None:
    create(client, "docs")

    response = client.post(LINKS, json={"name": "DOCS", "destination_url": "https://x.com/"})

    assert response.status_code == 409
    assert response.json() == {"detail": "go/docs already exists"}


def test_create_invalid_is_unprocessable(client: TestClient) -> None:
    response = client.post(LINKS, json={"name": "-bad", "destination_url": "ftp://x.com"})

    assert response.status_code == 422
    fields = {tuple(error["loc"]) for error in response.json()["detail"]}
    assert fields == {("body", "name"), ("body", "destination_url")}


def test_patch_invalid_is_unprocessable(client: TestClient) -> None:
    create(client, "docs")

    response = client.patch(f"{LINKS}/docs", json={"destination_url": "not a url"})

    assert response.status_code == 422


def test_missing_link_is_not_found(client: TestClient) -> None:
    assert client.get(f"{LINKS}/missing").status_code == 404
    patch = client.patch(f"{LINKS}/missing", json={"destination_url": "https://x.com/"})
    assert patch.status_code == 404
    assert client.delete(f"{LINKS}/missing").status_code == 404


def test_api_name_lookup_is_case_insensitive(client: TestClient) -> None:
    create(client, "docs")

    assert client.get(f"{LINKS}/Docs").status_code == 200


def test_destination_url_too_long_once_normalized_is_rejected(client: TestClient) -> None:
    response = client.post(
        LINKS, json={"name": "long", "destination_url": "https://example.com/" + "é" * 1000}
    )

    assert response.status_code == 422
    [error] = response.json()["detail"]
    assert error["loc"] == ["body", "destination_url"]
    assert error["msg"] == "URL should have at most 2048 characters"
