.PHONY: install dev run build test lint format types seed

BACKEND := cd backend &&
FRONTEND := cd frontend &&
# Single source of truth for ports; override with `make dev BACKEND_PORT=9000` or the
# environment. Exported so the Vite config sees them too.
BACKEND_PORT ?= 8000
FRONTEND_PORT ?= 5173
export BACKEND_PORT FRONTEND_PORT

UVICORN := uv run uvicorn golinks.main:app --port $(BACKEND_PORT)

install:
	$(BACKEND) uv sync
	$(FRONTEND) npm install

# Backend with reload on :$(BACKEND_PORT) plus the Vite dev server (hot reload) on :$(FRONTEND_PORT).
dev:
	@trap 'kill 0' INT TERM EXIT; \
	($(BACKEND) FRONTEND_URL=http://localhost:$(FRONTEND_PORT) $(UVICORN) --reload) & \
	($(FRONTEND) npm run dev) & \
	wait

build:
	$(FRONTEND) npm run build

# Everything served by FastAPI on :$(BACKEND_PORT): http://go.localhost:$(BACKEND_PORT)
run: build
	$(BACKEND) SERVE_SPA=1 $(UVICORN)

test:
	$(BACKEND) uv run pytest
	$(FRONTEND) npm test
	node --test extension/rules.test.mjs

lint:
	$(BACKEND) uv run ruff check . && uv run ruff format --check . && uv run mypy src tests
	$(FRONTEND) npm run lint && npm run typecheck

format:
	$(BACKEND) uv run ruff check --fix . && uv run ruff format .

# Regenerate frontend API types from the backend's OpenAPI schema.
types:
	$(BACKEND) uv run python -m golinks.openapi > ../frontend/openapi.json
	$(FRONTEND) npx --yes openapi-typescript@7.13.0 openapi.json -o src/api/schema.d.ts && rm openapi.json

seed:
	$(BACKEND) uv run python -m golinks.seed
