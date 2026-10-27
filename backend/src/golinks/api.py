"""JSON API for managing Go Links, mounted under /_/api."""

from fastapi import APIRouter, HTTPException, status

from golinks.db import Link
from golinks.dependencies import Repository
from golinks.domain import LinkCreate, LinkRead, LinkUpdate, Name
from golinks.repository import LinkAlreadyExistsError

router = APIRouter(prefix="/links", tags=["links"])


def _not_found(name: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"go/{name} not found")


def _get_or_404(repository: Repository, name: str) -> Link:
    link = repository.get(name)
    if link is None:
        raise _not_found(name)
    return link


@router.get("")
def list_links(repository: Repository) -> list[LinkRead]:
    return [LinkRead.model_validate(link) for link in repository.list()]


@router.post("", status_code=status.HTTP_201_CREATED, responses={409: {}})
def create_link(body: LinkCreate, repository: Repository) -> LinkRead:
    try:
        link = repository.create(body.name, str(body.destination_url))
    except LinkAlreadyExistsError as error:
        raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error
    return LinkRead.model_validate(link)


@router.get("/{name}", responses={404: {}})
def get_link(name: Name, repository: Repository) -> LinkRead:
    return LinkRead.model_validate(_get_or_404(repository, name))


@router.patch("/{name}", responses={404: {}})
def update_link(name: Name, body: LinkUpdate, repository: Repository) -> LinkRead:
    link = repository.update_destination(name, str(body.destination_url))
    if link is None:
        raise _not_found(name)
    return LinkRead.model_validate(link)


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT, responses={404: {}})
def delete_link(name: Name, repository: Repository) -> None:
    if not repository.delete(name):
        raise _not_found(name)
