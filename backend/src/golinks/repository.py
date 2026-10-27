from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from golinks.db import Link


class LinkAlreadyExistsError(Exception):
    def __init__(self, name: str) -> None:
        super().__init__(f"go/{name} already exists")
        self.name = name


class LinkRepository:
    """Data access for Go Links. Expects Names already normalized by the domain types."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list(self) -> list[Link]:
        return list(self._session.scalars(select(Link).order_by(Link.name)))

    def get(self, name: str) -> Link | None:
        return self._session.get(Link, name)

    def create(self, name: str, destination_url: str) -> Link:
        link = Link(name=name, destination_url=destination_url)
        self._session.add(link)
        try:
            self._session.commit()
        except IntegrityError as error:
            self._session.rollback()
            raise LinkAlreadyExistsError(name) from error
        return link

    def update_destination(self, name: str, destination_url: str) -> Link | None:
        link = self.get(name)
        if link is None:
            return None
        link.destination_url = destination_url
        self._session.commit()
        return link

    def delete(self, name: str) -> bool:
        link = self.get(name)
        if link is None:
            return False
        self._session.delete(link)
        self._session.commit()
        return True
