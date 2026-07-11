import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagsPage } from './TagsPage'
import { AppContainerContext } from '../../providers/AppContainerContext'
import type { AppContainer } from '../../../composition/container'
import { Tag } from '../../../domain/entities/Tag'
import { Tenant } from '../../../domain/value-objects/Tenant'
import { User } from '../../../domain/entities/User'

const tenant = Tenant.create('tenant-123')
const tenantContext = { tenant, user: User.create({ id: 'user-1', tenant }) }
const vipTag = Tag.create({
  id: 'tag-1',
  name: 'VIP',
  color: '#0d9488',
  description: 'High-value client',
})

interface FakeUseCases {
  getCurrentSession: { execute: () => Promise<typeof tenantContext | null> }
  listTags: { execute: () => Promise<Tag[]> }
  createTag: { execute: (...args: unknown[]) => Promise<Tag> }
  updateTag: { execute: (...args: unknown[]) => Promise<Tag> }
  deleteTag: { execute: (...args: unknown[]) => Promise<void> }
}

function buildContainer(overrides: Partial<FakeUseCases> = {}): AppContainer {
  return {
    useCases: {
      initiateLogin: { execute: vi.fn(() => Promise.resolve()) },
      handleAuthCallback: { execute: vi.fn(() => Promise.reject(new Error('not used'))) },
      logout: { execute: vi.fn(() => Promise.resolve()) },
      getCurrentSession: { execute: vi.fn(() => Promise.resolve(tenantContext)) },
      listTags: { execute: vi.fn(() => Promise.resolve([vipTag])) },
      createTag: { execute: vi.fn(() => Promise.resolve(vipTag)) },
      updateTag: { execute: vi.fn(() => Promise.resolve(vipTag)) },
      deleteTag: { execute: vi.fn(() => Promise.resolve()) },
      ...overrides,
    },
  } as unknown as AppContainer
}

function renderTagsPage(container: AppContainer): void {
  render(
    <AppContainerContext.Provider value={container}>
      <TagsPage />
    </AppContainerContext.Provider>,
  )
}

describe('TagsPage', () => {
  it('renders the tag list once loaded', async () => {
    renderTagsPage(buildContainer())

    expect(await screen.findByText('VIP')).toBeInTheDocument()
    expect(screen.getByText('High-value client')).toBeInTheDocument()
  })

  it('shows an empty state when there are no tags', async () => {
    renderTagsPage(buildContainer({ listTags: { execute: vi.fn(() => Promise.resolve([])) } }))

    expect(await screen.findByText(/nenhuma etiqueta ainda/i)).toBeInTheDocument()
  })

  it('shows an error state when loading tags fails', async () => {
    renderTagsPage(
      buildContainer({
        listTags: { execute: vi.fn(() => Promise.reject(new Error('network down'))) },
      }),
    )

    expect(
      await screen.findByText(/não foi possível carregar as etiquetas: network down/i),
    ).toBeInTheDocument()
  })

  it('creates a tag through the form and refreshes the list', async () => {
    const createTagSpy = vi.fn(() => Promise.resolve(vipTag))
    const listTagsSpy = vi.fn(() => Promise.resolve([vipTag]))
    renderTagsPage(
      buildContainer({ createTag: { execute: createTagSpy }, listTags: { execute: listTagsSpy } }),
    )
    await screen.findByText('VIP')
    listTagsSpy.mockClear()

    await userEvent.click(screen.getByRole('button', { name: /nova etiqueta/i }))
    await userEvent.type(screen.getByLabelText(/nome/i), 'Returning')
    await userEvent.click(screen.getByRole('button', { name: 'Cor #ef4444' }))
    await userEvent.click(screen.getByRole('button', { name: /criar etiqueta/i }))

    expect(createTagSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, {
      name: 'Returning',
      color: '#ef4444',
    })
    await vi.waitFor(() => {
      expect(listTagsSpy).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole('button', { name: /criar etiqueta/i })).not.toBeInTheDocument()
  })

  it('shows a form error when creation fails and keeps the form open', async () => {
    renderTagsPage(
      buildContainer({
        createTag: {
          execute: vi.fn(() => Promise.reject(new Error('Tag name is already in use.'))),
        },
      }),
    )
    await screen.findByText('VIP')

    await userEvent.click(screen.getByRole('button', { name: /nova etiqueta/i }))
    await userEvent.type(screen.getByLabelText(/nome/i), 'VIP')
    await userEvent.click(screen.getByRole('button', { name: /criar etiqueta/i }))

    expect(await screen.findByText('Tag name is already in use.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /criar etiqueta/i })).toBeInTheDocument()
  })

  it('edits a tag through the inline form', async () => {
    const updateTagSpy = vi.fn(() => Promise.resolve(vipTag))
    renderTagsPage(buildContainer({ updateTag: { execute: updateTagSpy } }))
    await screen.findByText('VIP')

    await userEvent.click(screen.getByRole('button', { name: /editar/i }))
    const nameInput = screen.getByLabelText(/nome/i)
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Renamed')
    await userEvent.click(screen.getByRole('button', { name: /salvar alterações/i }))

    expect(updateTagSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'tag-1', {
      name: 'Renamed',
      color: '#0d9488',
      description: 'High-value client',
    })
  })

  describe('delete', () => {
    beforeEach(() => {
      vi.spyOn(window, 'confirm')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('deletes the tag when the confirmation is accepted', async () => {
      vi.mocked(window.confirm).mockReturnValue(true)
      const deleteTagSpy = vi.fn(() => Promise.resolve())
      renderTagsPage(buildContainer({ deleteTag: { execute: deleteTagSpy } }))
      await screen.findByText('VIP')

      await userEvent.click(screen.getByRole('button', { name: /excluir/i }))

      expect(window.confirm).toHaveBeenCalledExactlyOnceWith('Excluir a etiqueta "VIP"?')
      expect(deleteTagSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'tag-1')
    })

    it('does not delete the tag when the confirmation is declined', async () => {
      vi.mocked(window.confirm).mockReturnValue(false)
      const deleteTagSpy = vi.fn(() => Promise.resolve())
      renderTagsPage(buildContainer({ deleteTag: { execute: deleteTagSpy } }))
      await screen.findByText('VIP')

      await userEvent.click(screen.getByRole('button', { name: /excluir/i }))

      expect(deleteTagSpy).not.toHaveBeenCalled()
    })
  })
})
