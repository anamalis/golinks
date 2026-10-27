// An in-memory fake of the /_/api/links endpoints, served through MSW so the real
// `client.ts` runs. Error bodies mirror FastAPI's `{"detail": ...}` shape. It doesn't
// validate input: tests that need a 422 override the handler with `server.use(...)`.
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { Link } from '../api/client'
import { compareNames } from '../links'

const BASE = '/_/api/links'
const TIMESTAMP = '2026-10-21T12:00:00Z'

const links = new Map<string, Link>()

export function seedLinks(...entries: Array<{ name: string; destination_url: string }>) {
  for (const entry of entries) {
    links.set(entry.name, { ...entry, created_at: TIMESTAMP, updated_at: TIMESTAMP })
  }
}

export function resetLinks() {
  links.clear()
}

const notFound = (name: string) =>
  HttpResponse.json({ detail: `go/${name} not found` }, { status: 404 })

export const server = setupServer(
  http.get(BASE, () =>
    HttpResponse.json([...links.values()].sort((a, b) => compareNames(a.name, b.name))),
  ),

  http.post(BASE, async ({ request }) => {
    const body = (await request.json()) as { name: string; destination_url: string }
    const name = body.name.trim().toLowerCase()
    if (links.has(name)) {
      return HttpResponse.json({ detail: `go/${name} already exists` }, { status: 409 })
    }
    seedLinks({ name, destination_url: body.destination_url })
    const link = links.get(name)
    return HttpResponse.json(link, { status: 201 })
  }),

  http.get(`${BASE}/:name`, ({ params }) => {
    const name = String(params.name)
    const link = links.get(name)
    return link ? HttpResponse.json(link) : notFound(name)
  }),

  http.patch(`${BASE}/:name`, async ({ params, request }) => {
    const name = String(params.name)
    const link = links.get(name)
    if (!link) return notFound(name)
    const { destination_url } = (await request.json()) as { destination_url: string }
    const updated = { ...link, destination_url, updated_at: '2026-10-22T12:00:00Z' }
    links.set(name, updated)
    return HttpResponse.json(updated)
  }),

  http.delete(`${BASE}/:name`, ({ params }) => {
    const name = String(params.name)
    if (!links.delete(name)) return notFound(name)
    return new HttpResponse(null, { status: 204 })
  }),
)
