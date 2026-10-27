import { screen } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { seedLinks, server } from '../test/api'
import { renderAt } from '../test/render'

beforeEach(() => {
  seedLinks({ name: 'docs', destination_url: 'https://docs.example.com/' })
})

describe('details', () => {
  it('shows the Go Link', async () => {
    renderAt('/_/links/docs')

    expect(await screen.findByRole('heading', { name: 'go/docs' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://docs.example.com/' })).toHaveAttribute(
      'href',
      'https://docs.example.com/',
    )
  })

  it('offers to create an unknown Name', async () => {
    renderAt('/_/links/nope')

    expect(await screen.findByText(/doesn't exist/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create it' })).toHaveAttribute('href', '/?name=nope')
  })

  it("treats a Name that can't exist as not found, without offering to create it", async () => {
    server.use(
      http.get('/_/api/links/:name', () =>
        HttpResponse.json(
          { detail: [{ loc: ['path', 'name'], msg: 'String should match pattern', type: 'x' }] },
          { status: 422 },
        ),
      ),
    )
    renderAt('/_/links/-bad')

    expect(await screen.findByText(/doesn't exist/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create it' })).not.toBeInTheDocument()
  })
})

describe('edit', () => {
  it('saves a new Destination URL', async () => {
    const { user } = renderAt('/_/links/docs')
    const input = await screen.findByRole('textbox', { name: /destination url/i })

    await user.clear(input)
    await user.type(input, 'https://new.example.com/')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('link', { name: 'https://new.example.com/' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('resets the form when the saved URL normalizes to the stored one', async () => {
    // The server adds the trailing slash, finds nothing changed and returns the stored link.
    server.use(
      http.patch('/_/api/links/:name', () =>
        HttpResponse.json({
          name: 'docs',
          destination_url: 'https://docs.example.com/',
          created_at: '2026-10-21T12:00:00Z',
          updated_at: '2026-10-21T12:00:00Z',
        }),
      ),
    )
    const { user } = renderAt('/_/links/docs')
    const input = await screen.findByRole('textbox', { name: /destination url/i })

    await user.clear(input)
    await user.type(input, 'https://docs.example.com')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('textbox', { name: /destination url/i })).toHaveValue(
      'https://docs.example.com/',
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('flags an invalid Destination URL inline', async () => {
    const { user } = renderAt('/_/links/docs')
    const input = await screen.findByRole('textbox', { name: /destination url/i })

    await user.clear(input)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(input).toHaveAccessibleDescription('Required.')
  })
})

describe('delete', () => {
  it('keeps the Go Link when the dialog is cancelled', async () => {
    const { user } = renderAt('/_/links/docs')

    await user.click(await screen.findByRole('button', { name: 'Delete go/docs' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete go/docs?' })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(dialog).not.toBeVisible()
    expect(screen.getByRole('heading', { name: 'go/docs' })).toBeInTheDocument()
  })

  it("can't be cancelled while the delete is in flight", async () => {
    server.use(http.delete('/_/api/links/:name', () => delay('infinite')))
    const { user } = renderAt('/_/links/docs')

    await user.click(await screen.findByRole('button', { name: 'Delete go/docs' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('button', { name: 'Deleting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('deletes the Go Link and returns to the list', async () => {
    const { user } = renderAt('/_/links/docs')

    await user.click(await screen.findByRole('button', { name: 'Delete go/docs' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('No Go Links yet.')).toBeInTheDocument()
  })
})
