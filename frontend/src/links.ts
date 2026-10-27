// Client-side hints mirroring the backend's Name rules (golinks/domain.py). The server
// remains authoritative; these only give earlier feedback in the form.
export const NAME_PATTERN = '[A-Za-z0-9][A-Za-z0-9_\\-]*'
export const NAME_MAX_LENGTH = 64
export const DESTINATION_URL_PATTERN = 'https?://.+'
export const DESTINATION_URL_MAX_LENGTH = 2048

export const linkPath = (name: string) => `/_/links/${encodeURIComponent(name)}`

/** The backend's list order (SQL `ORDER BY name`): by code point, not locale. */
export const compareNames = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

export function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString()
}
