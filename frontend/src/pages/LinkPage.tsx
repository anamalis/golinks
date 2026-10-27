import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router'
import { api, ApiError, type Link } from '../api/client'
import { DestinationUrlField } from '../components/fields'
import { Button, Card, ConfirmDialog, linkStyles, Message } from '../components/ui'
import { useForm } from '../forms'
import { formatTimestamp } from '../links'

export default function LinkPage() {
  const { name = '' } = useParams()
  // Keyed by Name so navigating between Go Links starts from a fresh loading state.
  return <LinkDetails key={name} name={name} />
}

function LinkDetails({ name }: { name: string }) {
  const [link, setLink] = useState<Link | null>(null)
  const [loadError, setLoadError] = useState<ApiError | Error | null>(null)

  useEffect(() => {
    api.get(name).then(setLink, setLoadError)
  }, [name])

  // A 422 means the Name can't exist at all, so there's nothing to offer to create.
  if (loadError instanceof ApiError && (loadError.status === 404 || loadError.status === 422)) {
    return (
      <Card>
        <h2 className="font-mono text-xl font-semibold">go/{name}</h2>
        <p className="mt-2 text-base">
          This Go Link doesn't exist.
          {loadError.status === 404 && (
            <>
              {' '}
              <RouterLink to={`/?${new URLSearchParams({ name })}`} className={linkStyles}>
                Create it
              </RouterLink>
              .
            </>
          )}
        </p>
      </Card>
    )
  }
  if (loadError) return <Message tone="error">{loadError.message}</Message>
  if (!link) return <p className="text-base text-zinc-500">Loading…</p>

  return (
    <div className="grid gap-6">
      <Card>
        <h2 className="font-mono text-xl font-semibold">go/{link.name}</h2>
        <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-base">
          <dt className="text-zinc-500">Destination URL</dt>
          <dd className="break-all">
            <a href={link.destination_url} className={linkStyles}>
              {link.destination_url}
            </a>
          </dd>
          <dt className="text-zinc-500">Created</dt>
          <dd>{formatTimestamp(link.created_at)}</dd>
          <dt className="text-zinc-500">Updated</dt>
          <dd>{formatTimestamp(link.updated_at)}</dd>
        </dl>
      </Card>
      <EditLinkForm link={link} onSaved={setLink} />
      <DeleteLinkButton name={link.name} />
    </div>
  )
}

function EditLinkForm({ link, onSaved }: { link: Link; onSaved: (link: Link) => void }) {
  const form = useForm({
    initialValues: { destination_url: link.destination_url },
    submit: (values) => api.update(link.name, values),
    // The server's normalized URL, which may differ from what was typed.
    valuesAfterSave: (saved) => ({ destination_url: saved.destination_url }),
    onSaved,
  })

  return (
    <Card>
      <h3 className="text-lg font-semibold">Edit</h3>
      <form
        key={form.key}
        {...form.props}
        className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start"
      >
        <DestinationUrlField
          {...form.input('destination_url')}
          error={form.errors.destination_url}
        />
        {/* Lines the button up with the input, below the field label. */}
        <Button
          type="submit"
          disabled={form.submitting || form.values.destination_url === link.destination_url}
          className="sm:mt-7.5"
        >
          Save
        </Button>
      </form>
      {form.error && (
        <div className="mt-3">
          <Message tone="error">{form.error}</Message>
        </div>
      )}
    </Card>
  )
}

function DeleteLinkButton({ name }: { name: string }) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await api.remove(name)
      navigate('/')
    } catch (caught) {
      setConfirming(false)
      setDeleting(false)
      setError((caught as Error).message)
    }
  }

  return (
    <div className="grid justify-items-start gap-2">
      <Button type="button" variant="dangerOutline" onClick={() => setConfirming(true)}>
        Delete go/{name}
      </Button>
      {error && <Message tone="error">{error}</Message>}
      <ConfirmDialog
        open={confirming}
        title={`Delete go/${name}?`}
        confirmLabel="Delete"
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={onDelete}
        onCancel={() => setConfirming(false)}
      >
        Anyone following <span className="font-mono">go/{name}</span> will land on the create
        form instead. This can't be undone.
      </ConfirmDialog>
    </div>
  )
}
