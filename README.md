# Go Links

First iteration of an internal URL shortcut service.

People reach long URLs through short names typed as `go/<name>`. Open `go/standup` and you're redirected to wherever `standup` points; if nobody has created it yet, you land on a form to create it.

Scoped to 1 hour of my own time.


## Prerequisites

- [uv](https://docs.astral.sh/uv/) (installs Python 3.13 from `backend/.python-version` if needed)
- Node 24
- `make`

## Quickstart

```sh
make install   # uv sync + npm install
make seed      # optional: example Go Links
make run       # builds the UI and serves everything on :8000
```

### Type `go/<name>` in your browser

Typing a bare `go/example` needs something to route it to the service. Commonly that can be DNS or a browser extension. For local use, you may use [`extension/`](extension/); this is a tiny Chromium extension (Chrome, Edge, Brave, Arc), just a manifest and static redirect rules.

1. Open `chrome://extensions`, turn on **Developer mode**
2. Click **Load unpacked** and pick the `extension/` folder.

Since browsers usually treat `go/...` as a search, in order to keep this extension and its setup very simple, it catches both `http://go/…` and a search for `go/<name>` on Google, Bing or DuckDuckGo. A search that isn't a valid Name (e.g. `go/docs setup`) stays a normal search.
If you have another default search engine, you'll have to input `http://go/docs` in the browser's omnibar in order to "teach" it that go links are URLs.

As an alternative to the extension, you may use <http://go.localhost:8000/> instead of `go/` (any `*.localhost` host resolves to your machine in modern browsers) and try <http://go.localhost:8000/example>.


## Some configuration options

Ports default to 8000 (backend) and 5173 (Vite) and are set once in the Makefile: override with e.g. `make dev BACKEND_PORT=9000 FRONTEND_PORT=5180` or environment variables. The extension, however, is hardcoded to `go.localhost:8000`, so if for any reason you need to use a different port, you'll need to edit `extension/rules.json` and reload the extension.

The SQLite database lives at `backend/data/golinks.db`. Set `DATABASE_URL` to use another one.

The backend serves the built UI only when `SERVE_SPA=1`, which `make run` sets; it then refuses to start without a build in `frontend/dist`. In `make dev` the UI always comes from Vite, so an old build is never served by mistake.

## Development

| Command | What it does |
| --- | --- |
| `make dev` | FastAPI with reload on :8000 + Vite dev server with hot reload on :5173 (proxies `/_/api` to :8000). Use the UI at <http://localhost:5173>; Go Links still resolve on :8000, and unknown Names redirect to the create form on :5173. |
| `make test` | Backend unit and integration tests (pytest, temp SQLite database per test), then frontend component tests (Vitest + Testing Library in happy-dom, API faked with MSW), then the extension's redirect rules (`node --test`). For watch mode: `cd frontend && npm run test:watch`. |
| `make lint` | ruff check + ruff format --check + mypy; oxlint + `tsc --noEmit` |
| `make format` | ruff fix + format |
| `make types` | Regenerate `frontend/src/api/schema.d.ts` from FastAPI's OpenAPI schema. Run it after changing an API model, and commit the result. |

Interactive API docs: <http://localhost:8000/_/api/docs>.

## How it works

### Resolution

- Names are case-insensitive (`/Standup` = `/standup`), and one trailing slash is ignored.
- The query string is dropped.
- Unknown Name → redirect to the create form with the Name pre-filled (`/?name=<name>`).
- `/<name>/anything` → 404. In a future iteration `/anything` would be appended to the path.

### Rules

- **Name**: `a-z 0-9 - _`, starts with a letter or digit, 1–64 characters, stored lowercase, unique. Immutable: renaming means deleting and recreating.
- **Destination URL**: absolute `http://` or `https://`, up to 2048 characters.

## Out of scope / next steps

- Path passthrough for handling extra segments (`go/docs/setup` → `https://example.com/docs/setup`) 
- Production `go/<name>` resolution: internal DNS or a proper extension that, among other things, doesn't rely on intercepting search engine requests.
- Authentication and ownership (who can edit or delete a Go Link).
- [Alembic] migrations.
- Link keywords for easier searching.
- CI check that fails if committed TS types are out of sync with the backend. 
- End-to-end tests
- Different hosts for links and for application URLs.
- Parameterized links.
