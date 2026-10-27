// Typed client for the Go Links API. Types are generated from FastAPI's OpenAPI schema
// (`make types`), so the backend's Pydantic models stay the single source of truth.
import type { FieldErrors } from '../forms'
import type { components } from './schema'

type Schemas = components['schemas']
export type Link = Schemas['LinkRead']
export type LinkCreate = Schemas['LinkCreate']
export type LinkUpdate = Schemas['LinkUpdate']
type ValidationError = Schemas['ValidationError']

const BASE = '/_/api/links'

/**
 * A non-2xx response, carrying FastAPI's `{"detail": ...}` as a readable message. For a
 * 422, errors about a request body field are also keyed by field name in `fieldErrors`.
 */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldErrors

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function describeDetail(detail: unknown): string | null {
  if (typeof detail === 'string') return detail
  // 422: a list of Pydantic validation errors; show which field each one is about.
  if (Array.isArray(detail)) {
    return (detail as ValidationError[])
      .map(({ loc, msg }) => `${loc.filter((part) => part !== 'body').join('.')}: ${msg}`)
      .join('; ')
  }
  return null
}

function bodyFieldErrors(detail: unknown): FieldErrors {
  if (!Array.isArray(detail)) return {}
  const errors: FieldErrors = {}
  for (const { loc, msg } of detail as ValidationError[]) {
    const [source, field] = loc
    if (source === 'body' && typeof field === 'string') errors[field] ??= msg
  }
  return errors
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const detail = body && typeof body === 'object' && 'detail' in body ? body.detail : null
    throw new ApiError(
      response.status,
      describeDetail(detail) ?? response.statusText,
      bodyFieldErrors(detail),
    )
  }
  return (response.status === 204 ? undefined : await response.json()) as T
}

const path = (name: string) => `/${encodeURIComponent(name)}`

export const api = {
  list: () => request<Link[]>(''),
  get: (name: string) => request<Link>(path(name)),
  create: (body: LinkCreate) => request<Link>('', { method: 'POST', body: JSON.stringify(body) }),
  update: (name: string, body: LinkUpdate) =>
    request<Link>(path(name), { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (name: string) => request<void>(path(name), { method: 'DELETE' }),
}
