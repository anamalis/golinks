import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router'
import { api, ApiError, type Link } from '../api/client'
import { DestinationUrlField } from '../components/fields'
import { Button, Card, Field, linkStyles, Message, TextInput } from '../components/ui'
import { useForm } from '../forms'
import { NAME_MAX_LENGTH, NAME_PATTERN, compareNames, formatTimestamp, linkPath } from '../links'

export default function LinksPage() {
  const [links, setLinks] = useState<Link[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.list().then(setLinks, (error: Error) => setLoadError(error.message))
  }, [])

  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase()
    if (!links || !query) return links
    return links.filter(
      (link) => link.name.includes(query) || link.destination_url.toLowerCase().includes(query),
    )
  }, [links, filter])

  const onCreated = (link: Link) =>
    setLinks((current) => [link, ...(current ?? [])].sort((a, b) => compareNames(a.name, b.name)))

  return (
    <div className="grid gap-6">
      <CreateLinkForm onCreated={onCreated} />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">All Go Links</h2>
          <TextInput
            type="search"
            placeholder="Filter by Name or Destination URL"
            aria-label="Filter Go Links"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="sm:max-w-xs"
          />
        </div>
        <div className="mt-4">
          {loadError && <Message tone="error">{loadError}</Message>}
          {visible === null && !loadError && <p className="text-base text-zinc-500">Loading…</p>}
          {visible?.length === 0 && (
            <p className="text-base text-zinc-500">
              {links?.length ? 'No Go Links match.' : 'No Go Links yet.'}
            </p>
          )}
          {visible && visible.length > 0 && (
            <table className="w-full text-left text-base">
              <thead className="border-b border-zinc-200 text-sm font-medium tracking-wide text-zinc-500 uppercase dark:border-zinc-800">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Destination URL</th>
                  <th className="py-2">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {visible.map((link) => (
                  <tr key={link.name} className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="py-3 pr-4 font-mono">
                      <RouterLink to={linkPath(link.name)} className={linkStyles}>
                        go/{link.name}
                      </RouterLink>
                    </td>
                    <td className="py-3 pr-4 break-all">
                      <a href={link.destination_url} className={linkStyles}>
                        {link.destination_url}
                      </a>
                    </td>
                    <td className="py-3 whitespace-nowrap text-zinc-500">
                      {formatTimestamp(link.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}

function CreateLinkForm({ onCreated }: { onCreated: (link: Link) => void }) {
  // `?name=` is where unknown Names land after resolution, so the form starts pre-filled.
  const [searchParams, setSearchParams] = useSearchParams()
  const nameParam = searchParams.get('name')
  const [prevNameParam, setPrevNameParam] = useState(nameParam)
  const [created, setCreated] = useState<Link | null>(null)
  const form = useForm({
    initialValues: { name: nameParam ?? '', destination_url: '' },
    submit: (values) => api.create(values),
    valuesAfterSave: () => ({ name: '', destination_url: '' }),
    onSaved: (link) => {
      onCreated(link)
      setCreated(link)
      setSearchParams({}, { replace: true })
    },
    describeError: (error, values) => {
      if (!(error instanceof ApiError && error.status === 409)) return (error as Error).message
      const existing = values.name.trim().toLowerCase()
      return (
        <>
          <RouterLink to={linkPath(existing)} className={`font-mono ${linkStyles}`}>
            go/{existing}
          </RouterLink>{' '}
          already exists.
        </>
      )
    },
  })

  // Start over when `?name=` changes (e.g. the header link, back/forward). A create clears
  // `?name=` itself, so only a new Name hides the "Created" message.
  if (nameParam !== prevNameParam) {
    setPrevNameParam(nameParam)
    if (nameParam) setCreated(null)
    form.reset({ name: nameParam ?? '', destination_url: '' })
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold">Create a Go Link</h2>
      <div className="mt-4 grid gap-4">
        {nameParam && (
          <Message tone="info">
            <strong className="font-mono">go/{nameParam}</strong> doesn't exist yet. Create it
            below.
          </Message>
        )}
        <form
          key={form.key}
          {...form.props}
          onSubmit={(event) => {
            setCreated(null)
            return form.props.onSubmit(event)
          }}
          className="grid gap-4 sm:grid-cols-[1fr_2fr_auto] sm:items-start"
        >
          <Field label="Name" error={form.errors.name}>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base font-normal text-zinc-500">go/</span>
              <TextInput
                required
                {...form.input('name')}
                pattern={NAME_PATTERN}
                maxLength={NAME_MAX_LENGTH}
                title="Use letters, digits, - and _, starting with a letter or digit."
                placeholder="standup"
                autoFocus={!form.values.name}
                className="font-mono"
              />
            </div>
          </Field>
          <DestinationUrlField
            {...form.input('destination_url')}
            error={form.errors.destination_url}
            placeholder="https://meet.example.com/standup"
            autoFocus={Boolean(form.values.name)}
          />
          {/* Lines the button up with the inputs, below the field labels. */}
          <Button type="submit" disabled={form.submitting} className="sm:mt-7.5">
            Create
          </Button>
        </form>
        {form.error && <Message tone="error">{form.error}</Message>}
        {created && (
          <Message tone="success">
            Created{' '}
            <RouterLink to={linkPath(created.name)} className={`font-mono ${linkStyles}`}>
              go/{created.name}
            </RouterLink>
            .
          </Message>
        )}
      </div>
    </Card>
  )
}
