from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request

from golinks.repository import LinkRepository


def get_repository(request: Request) -> Iterator[LinkRepository]:
    with request.app.state.session_factory() as session:
        yield LinkRepository(session)


Repository = Annotated[LinkRepository, Depends(get_repository)]
