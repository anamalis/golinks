import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI
from sqlalchemy.orm import sessionmaker

from golinks import api, resolution, spa
from golinks.db import create_db_engine, database_url

# Every app-owned route lives under /_/ so it can never collide with a Name.
API_PREFIX = "/_/api"


def create_app(
    db_url: str | None = None,
    frontend_url: str = "",
    spa_dist_dir: Path | None = None,
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        engine = create_db_engine(db_url or database_url())
        app.state.session_factory = sessionmaker(engine, expire_on_commit=False)
        yield
        engine.dispose()

    app = FastAPI(
        title="Go Links",
        docs_url=f"{API_PREFIX}/docs",
        redoc_url=None,
        openapi_url=f"{API_PREFIX}/openapi.json",
        lifespan=lifespan,
    )
    # Where unknown Names are sent to be created; defaults to this app's own origin.
    app.state.frontend_url = frontend_url.rstrip("/")

    api_router = APIRouter(prefix=API_PREFIX)

    @api_router.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    api_router.include_router(api.router)
    app.include_router(api_router)
    # Only when serving a build (`make run`); in `make dev` the Vite dev server serves the UI.
    if spa_dist_dir is not None:
        spa.mount_spa(app, spa_dist_dir, API_PREFIX)
    # Must stay last: it catches every path not claimed above.
    app.include_router(resolution.router)
    return app


app = create_app(
    frontend_url=os.environ.get("FRONTEND_URL", ""),
    spa_dist_dir=spa.dist_dir_from_env(),
)
