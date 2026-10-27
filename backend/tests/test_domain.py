import pytest
from pydantic import ValidationError

from golinks.domain import LinkCreate, LinkUpdate

URL = "https://example.com/page"


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("standup", "standup"),
        ("Standup", "standup"),
        ("  OnCall  ", "oncall"),
        ("q3-planning_v2", "q3-planning_v2"),
        ("2fa", "2fa"),
        ("a", "a"),
        ("x" * 64, "x" * 64),
    ],
)
def test_valid_names_are_normalized(raw: str, expected: str) -> None:
    assert LinkCreate.model_validate({"name": raw, "destination_url": URL}).name == expected


@pytest.mark.parametrize(
    "raw",
    [
        "",
        "-standup",
        "_standup",
        "stand up",
        "stand/up",
        "stand.up",
        "café",
        "_",
        "x" * 65,
    ],
)
def test_invalid_names_are_rejected(raw: str) -> None:
    with pytest.raises(ValidationError):
        LinkCreate.model_validate({"name": raw, "destination_url": URL})


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com/page",
        "http://intranet.local:8080/path?q=1#section",
        "https://localhost:3000",
    ],
)
def test_valid_destination_urls(url: str) -> None:
    assert str(LinkUpdate.model_validate({"destination_url": url}).destination_url).startswith(url)


@pytest.mark.parametrize(
    "url",
    [
        "",
        "example.com",
        "/relative/path",
        "ftp://example.com/file",
        "javascript:alert(1)",
        "mailto:someone@example.com",
        "https://example.com/" + "x" * 2048,
        # Under the limit as typed, over it once percent-encoded (each "é" becomes "%C3%A9").
        pytest.param("https://example.com/" + "é" * 1000, id="too-long-once-encoded"),
    ],
)
def test_invalid_destination_urls_are_rejected(url: str) -> None:
    with pytest.raises(ValidationError):
        LinkUpdate.model_validate({"destination_url": url})
