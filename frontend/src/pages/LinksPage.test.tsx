import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { seedLinks, server } from '../test/api'
import { renderAt } from '../test/render'

const nameInput = () => screen.getByRole('textbox', { name: /^name/i })
const urlInput = () => screen.getByRole('textbox', { name: /destination url/i })

describe('list', () => {
  it('shows every Go Link', async () => {
    seedLinks(
      { name: 'docs', destination_url: 'https://docs.example.com/' },
      { name: 'github', destination_url: 'https://github.com/' },
    )
    renderAt('/')

    expect(await screen.findByRole('link', { name: 'go/docs' })).toHaveAttribute(
      'href',
      '/_/links/docs',
    )
    expect(screen.getByRole('link', { name: 'go/github' })).toBeInTheDocument()
  })

  it('filters by Name or Destination URL', async () => {
    seedLinks(
      { name: 'docs', destination_url: 'https://docs.example.com/' },
      { name: 'github', destination_url: 'https://github.com/' },
    )
    const { user } = renderAt('/')
    await screen.findByRole('link', { name: 'go/docs' })
    const filter = screen.getByRole('searchbox', { name: /filter/i })

    await user.type(filter, 'GITHUB.COM')
    expect(screen.queryByRole('link', { name: 'go/docs' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'go/github' })).toBeInTheDocument()

    await user.clear(filter)
    await user.type(filter, 'nothing-like-this')
    expect(screen.getByText('No Go Links match.')).toBeInTheDocument()
  })

  it("keeps the server's order after a create", async () => {
    seedLinks({ name: 'a_b', destination_url: 'https://example.com/' })
    const { user } = renderAt('/')
    await screen.findByRole('link', { name: 'go/a_b' })

    await user.type(nameInput(), 'a-b')
    await user.type(urlInput(), 'https://example.com/')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await screen.findByText(/^Created/)

    // Same order as SQL `ORDER BY name`: by code point, so "-" before "_".
    const names = within(screen.getByRole('table'))
      .getAllByRole('link', { name: /^go\// })
      .map((link) => link.textContent)
    expect(names).toEqual(['go/a-b', 'go/a_b'])
  })

  it('says when there are no Go Links yet', async () => {
    renderAt('/')

    expect(await screen.findByText('No Go Links yet.')).toBeInTheDocument()
  })
})

describe('create', () => {
  it('creates a Go Link and adds it to the list', async () => {
    const { user } = renderAt('/')
    await screen.findByText('No Go Links yet.')

    await user.type(nameInput(), 'Standup')
    await user.type(urlInput(), 'https://meet.example.com/standup')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText(/^Created/)).toHaveTextContent('Created go/standup.')
    const table = screen.getByRole('table')
    expect(within(table).getByRole('link', { name: 'go/standup' })).toBeInTheDocument()
    expect(nameInput()).toHaveValue('')
  })

  it('pre-fills the Name from ?name=', async () => {
    renderAt('/?name=nope')

    expect(nameInput()).toHaveValue('nope')
    expect(screen.getByText(/doesn't exist yet/)).toHaveTextContent('go/nope')
  })

  it('creates a pre-filled Name and confirms it', async () => {
    const { user } = renderAt('/?name=nope')

    await user.type(urlInput(), 'https://example.com/')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText(/^Created/)).toHaveTextContent('Created go/nope.')
    expect(nameInput()).toHaveValue('')
    expect(screen.queryByText(/doesn't exist yet/)).not.toBeInTheDocument()
  })

  it('follows ?name= when it changes on the same page', async () => {
    const { user } = renderAt('/?name=nope')
    expect(nameInput()).toHaveValue('nope')

    await user.click(screen.getByRole('link', { name: /^go\/\s*links$/ }))

    expect(nameInput()).toHaveValue('')
    expect(screen.queryByText(/doesn't exist yet/)).not.toBeInTheDocument()
  })

  it('links to the existing Go Link when the Name is taken', async () => {
    seedLinks({ name: 'docs', destination_url: 'https://docs.example.com/' })
    const { user } = renderAt('/')

    await user.type(nameInput(), 'docs')
    await user.type(urlInput(), 'https://other.example.com/')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('go/docs already exists.')
    expect(within(alert).getByRole('link', { name: 'go/docs' })).toHaveAttribute(
      'href',
      '/_/links/docs',
    )
  })
})

describe('validation', () => {
  it('flags missing fields inline without calling the API', async () => {
    let posted = false
    server.use(
      http.post('/_/api/links', () => {
        posted = true
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const { user } = renderAt('/')

    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(nameInput()).toHaveAccessibleDescription('Required.')
    expect(urlInput()).toHaveAccessibleDescription('Required.')
    expect(nameInput()).toHaveFocus()
    expect(posted).toBe(false)
  })

  it('explains invalid Names and Destination URLs', async () => {
    const { user } = renderAt('/')

    await user.type(nameInput(), '-docs')
    await user.type(urlInput(), 'not a url')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(nameInput()).toHaveAccessibleDescription(
      'Use letters, digits, - and _, starting with a letter or digit.',
    )
    expect(urlInput()).toHaveAccessibleDescription('Enter a full URL, like https://example.com.')

    await user.clear(urlInput())
    await user.type(urlInput(), 'ftp://example.com')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(urlInput()).toHaveAccessibleDescription('Use an http:// or https:// URL.')
  })

  it('shows server validation errors under the field they belong to', async () => {
    server.use(
      http.post('/_/api/links', () =>
        HttpResponse.json(
          { detail: [{ loc: ['body', 'destination_url'], msg: 'URL too long', type: 'x' }] },
          { status: 422 },
        ),
      ),
    )
    const { user } = renderAt('/')

    await user.type(nameInput(), 'docs')
    await user.type(urlInput(), 'https://docs.example.com/')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await screen.findByText('URL too long')
    expect(urlInput()).toHaveAccessibleDescription('URL too long')
    expect(urlInput()).toBeInvalid()
    expect(nameInput()).not.toBeInvalid()
  })

  it('clears a field error as soon as the field is edited', async () => {
    const { user } = renderAt('/')

    await user.click(screen.getByRole('button', { name: 'Create' }))
    await user.type(nameInput(), 'd')

    expect(nameInput()).not.toHaveAccessibleDescription('Required.')
    expect(nameInput()).not.toBeInvalid()
    expect(urlInput()).toHaveAccessibleDescription('Required.')
  })
})
