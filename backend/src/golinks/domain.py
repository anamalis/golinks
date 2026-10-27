"""Go Link domain rules. These Pydantic types are the single source of truth for validation."""

from datetime import datetime
from typing import Annotated

from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    HttpUrl,
    StringConstraints,
)
from pydantic_core import PydanticCustomError

NAME_PATTERN = r"^[a-z0-9][a-z0-9_-]*$"
NAME_MAX_LENGTH = 64
DESTINATION_URL_MAX_LENGTH = 2048


def normalize_name(value: object) -> object:
    """Names are case-insensitive: compare and store them lowercased."""
    return value.strip().lower() if isinstance(value, str) else value


Name = Annotated[
    str,
    BeforeValidator(normalize_name),
    StringConstraints(min_length=1, max_length=NAME_MAX_LENGTH, pattern=NAME_PATTERN),
]


def check_url_length(url: HttpUrl) -> HttpUrl:
    """Checked on the normalized URL, which is what gets stored (percent-encoding grows it)."""
    if len(str(url)) > DESTINATION_URL_MAX_LENGTH:
        raise PydanticCustomError(
            "url_too_long",
            "URL should have at most {max_length} characters",
            {"max_length": DESTINATION_URL_MAX_LENGTH},
        )
    return url


# Absolute http(s) URLs only; HttpUrl rejects other schemes and relative URLs.
DestinationUrl = Annotated[HttpUrl, AfterValidator(check_url_length)]


class LinkCreate(BaseModel):
    name: Name
    destination_url: DestinationUrl


class LinkUpdate(BaseModel):
    """Only the Destination URL is editable; a Name never changes once created."""

    destination_url: DestinationUrl


class LinkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    destination_url: str
    created_at: datetime
    updated_at: datetime
