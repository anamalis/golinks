"""Resolves Go Links at the root: /<name> redirects to its Destination URL."""

from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import TypeAdapter, ValidationError

from golinks.dependencies import Repository
from golinks.domain import Name

router = APIRouter(include_in_schema=False)

_name_adapter: TypeAdapter[str] = TypeAdapter(Name)


def _parse_name(path: str) -> str | None:
    # One trailing slash is tolerated; anything deeper (/<name>/extra) is reserved for
    # future parameterized links, so it must not resolve today.
    candidate = path.removesuffix("/")
    if "/" in candidate:
        return None
    try:
        return _name_adapter.validate_python(candidate)
    except ValidationError:
        return None


# Registered last, so `/` and every app route under `/_/` take precedence (ADR-0001).
# The query string is intentionally dropped, not forwarded.
@router.api_route("/{path:path}", methods=["GET", "HEAD"])
def resolve(path: str, request: Request, repository: Repository) -> RedirectResponse:
    name = _parse_name(path)
    if name is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    # Always 302: Destination URLs are editable, and permanent redirects get cached.
    link = repository.get(name)
    if link is not None:
        return RedirectResponse(link.destination_url, status.HTTP_302_FOUND)

    frontend_url: str = request.app.state.frontend_url
    create_form = f"{frontend_url}/?{urlencode({'name': name})}"
    return RedirectResponse(create_form, status.HTTP_302_FOUND)
