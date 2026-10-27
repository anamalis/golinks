"""Serves the built frontend: `/` and `/_/*` fall back to the SPA."""

import os
from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

DEFAULT_DIST_DIR = Path(__file__).resolve().parents[3] / "frontend" / "dist"


def dist_dir_from_env(dist_dir: Path = DEFAULT_DIST_DIR) -> Path | None:
    """The build to serve when SERVE_SPA=1 (set by `make run`), else None.

    Opt-in rather than "whenever a build exists", so `make dev` never serves a stale one.
    """
    if os.environ.get("SERVE_SPA") != "1":
        return None
    if not (dist_dir / "index.html").is_file():
        raise RuntimeError(f"SERVE_SPA=1 but {dist_dir}/index.html is missing; run `make build`")
    return dist_dir


def mount_spa(app: FastAPI, dist_dir: Path, api_prefix: str) -> None:
    """Register the SPA routes. Call after the API routes and before root resolution."""
    index = dist_dir / "index.html"
    # Vite emits hashed assets under dist/_/assets (see frontend/vite.config.ts).
    app.mount("/_/assets", StaticFiles(directory=dist_dir / "_" / "assets"), name="assets")

    router = APIRouter(include_in_schema=False)
    api_path = api_prefix.removeprefix("/_/")

    @router.get("/")
    def home() -> FileResponse:
        return FileResponse(index)

    @router.get("/_/{path:path}")
    def client_route(path: str) -> FileResponse:
        # Unknown API paths stay JSON 404s instead of returning the SPA shell.
        if path == api_path or path.startswith(f"{api_path}/"):
            raise HTTPException(status.HTTP_404_NOT_FOUND)
        return FileResponse(index)

    app.include_router(router)
