"""Create example Go Links; safe to run repeatedly (`make seed`)."""

from sqlalchemy.orm import Session

from golinks.db import create_db_engine, database_url
from golinks.repository import LinkRepository

EXAMPLE_LINKS = {
    "docs": "https://fastapi.tiangolo.com/",
    "github": "https://github.com/",
    "calendar": "https://calendar.google.com/",
    "mail": "https://mail.google.com/",
}


def seed(repository: LinkRepository) -> list[str]:
    created = []
    for name, destination_url in EXAMPLE_LINKS.items():
        if repository.get(name) is None:
            repository.create(name, destination_url)
            created.append(name)
    return created


if __name__ == "__main__":
    engine = create_db_engine(database_url())
    with Session(engine) as session:
        created = seed(LinkRepository(session))
    print(f"Created: {', '.join(created)}" if created else "Nothing to do: already seeded.")
