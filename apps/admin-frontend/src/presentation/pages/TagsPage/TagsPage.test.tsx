import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagsPage } from './TagsPage'
import { AppContainerContext } from '../../providers/AppContainerContext'
import { AuthProvider } from '../../providers/AuthProvider'
import type { AppContainer, CatalogFacade } from '../../../composition/container'
import { Tag } from '../../../domain/entities/Tag'
import { Tenant } from '../../../domain/value-objects/Tenant'
import { User } from '../../../domain/entities/User'
import { MALICIOUS_PAYLOADS } from '../../../test/fixtures/maliciousPayloads'
import { createFakeAppContainer } from '../../../test/fixtures/createFakeAppContainer'
import { AppError } from '../../../application/errors/AppError'

const tenant = Tenant.create('tenant-123')
const tenantContext = { tenant, user: User.create({ id: 'user-1', tenant }) }
const vipTag = Tag.create({
  id: 'tag-1',
  name: 'VIP',
  color: '#0d9488',
  description: 'High-value client',
})

function buildContainer(overrides: Partial<CatalogFacade> = {}): AppContainer {
  return createFakeAppContainer({
    auth: { getCurrentSession: { execute: vi.fn(() => Promise.resolve(tenantContext)) } },
    catalog: {
      listTags: { execute: vi.fn(() => Promise.resolve([vipTag])) },
      createTag: { execute: vi.fn(() => Promise.resolve(vipTag)) },
      updateTag: { execute: vi.fn(() => Promise.resolve(vipTag)) },
      deleteTag: { execute: vi.fn(() => Promise.resolve()) },
      ...overrides,
    },
  })
}

function renderTagsPage(container: AppContainer): void {
  render(
    <AppContainerContext.Provider value={container}>
      <AuthProvider>
        <TagsPage />
      </AuthProvider>
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
    await userEvent.type(screen.getByLabelText('Nome'), 'Returning')
    await userEvent.click(screen.getByRole('radio', { name: 'Cor #ef4444' }))
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

  it('shows a validation error and does not submit when the name is blank', async () => {
    const createTagSpy = vi.fn(() => Promise.resolve(vipTag))
    renderTagsPage(buildContainer({ createTag: { execute: createTagSpy } }))
    await screen.findByText('VIP')

    await userEvent.click(screen.getByRole('button', { name: /nova etiqueta/i }))
    await userEvent.click(screen.getByRole('button', { name: /criar etiqueta/i }))

    expect(
      await screen.findByText(/o nome da etiqueta deve ter entre 1 e 40 caracteres/i),
    ).toBeInTheDocument()
    expect(createTagSpy).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Nome'), 'Returning')
    expect(
      screen.queryByText(/o nome da etiqueta deve ter entre 1 e 40 caracteres/i),
    ).not.toBeInTheDocument()
  })

  it('does not carry a previously edited tag into a freshly opened create dialog', async () => {
    renderTagsPage(buildContainer())
    await screen.findByText('VIP')

    await userEvent.click(screen.getByRole('button', { name: /editar/i }))
    const editDialog = await screen.findByRole('dialog')
    expect(within(editDialog).getByText('Editar etiqueta')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('VIP')
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))

    await userEvent.click(screen.getByRole('button', { name: /nova etiqueta/i }))
    const createDialog = await screen.findByRole('dialog')
    expect(within(createDialog).getByText('Nova etiqueta')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('')
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
    await userEvent.type(screen.getByLabelText('Nome'), 'VIP')
    await userEvent.click(screen.getByRole('button', { name: /criar etiqueta/i }))

    expect(await screen.findByText('Tag name is already in use.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /criar etiqueta/i })).toBeInTheDocument()
  })

  describe('structured server errors', () => {
    it('maps validation field errors from the API onto the Nome and Descrição fields', async () => {
      const validationError = new AppError({
        code: 'validation',
        message: 'Ocorreram erros de validação.',
        retryable: false,
        rawFieldErrors: {
          Name: 'O nome é obrigatório.',
          Description: 'A descrição é muito longa.',
        },
      })
      renderTagsPage(
        buildContainer({ createTag: { execute: vi.fn(() => Promise.reject(validationError)) } }),
      )
      await screen.findByText('VIP')

      await userEvent.click(screen.getByRole('button', { name: /nova etiqueta/i }))
      await userEvent.type(screen.getByLabelText('Nome'), 'Qualquer')
      await userEvent.click(screen.getByRole('button', { name: /criar etiqueta/i }))

      const nameError = await screen.findByText('O nome é obrigatório.')
      expect(nameError).toHaveAttribute('role', 'alert')
      const descriptionError = screen.getByText('A descrição é muito longa.')
      expect(descriptionError).toHaveAttribute('role', 'alert')
      // Name is listed first in the backend's `errors` map, so it - not
      // Description - receives focus as the "first" mapped field.
      expect(screen.getByLabelText('Nome')).toHaveFocus()
    })

    it('maps a duplicate-name conflict code from the API onto the Nome field', async () => {
      const conflictError = new AppError({
        code: 'conflict',
        message: 'Já existe uma etiqueta com esse nome.',
        retryable: false,
        backendCode: 'Tag.DuplicateName',
      })
      renderTagsPage(
        buildContainer({ createTag: { execute: vi.fn(() => Promise.reject(conflictError)) } }),
      )
      await screen.findByText('VIP')

      await userEvent.click(screen.getByRole('button', { name: /nova etiqueta/i }))
      await userEvent.type(screen.getByLabelText('Nome'), 'VIP')
      await userEvent.click(screen.getByRole('button', { name: /criar etiqueta/i }))

      const fieldError = await screen.findByText('Já existe uma etiqueta com esse nome.')
      expect(fieldError).toHaveAttribute('role', 'alert')
      expect(screen.getByLabelText('Nome')).toHaveFocus()
    })
  })

  it('edits a tag through the inline form', async () => {
    const updateTagSpy = vi.fn(() => Promise.resolve(vipTag))
    renderTagsPage(buildContainer({ updateTag: { execute: updateTagSpy } }))
    await screen.findByText('VIP')

    await userEvent.click(screen.getByRole('button', { name: /editar/i }))
    const nameInput = screen.getByLabelText('Nome')
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
    it('shows a confirmation dialog naming the tag before deleting', async () => {
      renderTagsPage(buildContainer())
      await screen.findByText('VIP')

      await userEvent.click(screen.getByRole('button', { name: /excluir/i }))

      const alertDialog = await screen.findByRole('alertdialog')
      expect(within(alertDialog).getByText(/excluir etiqueta/i)).toBeInTheDocument()
      expect(within(alertDialog).getByText(/"VIP"/)).toBeInTheDocument()
    })

    it('deletes the tag when the confirmation is accepted', async () => {
      const deleteTagSpy = vi.fn(() => Promise.resolve())
      renderTagsPage(buildContainer({ deleteTag: { execute: deleteTagSpy } }))
      await screen.findByText('VIP')

      await userEvent.click(screen.getByRole('button', { name: /excluir/i }))
      const alertDialog = await screen.findByRole('alertdialog')
      await userEvent.click(within(alertDialog).getByRole('button', { name: 'Excluir' }))

      expect(deleteTagSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'tag-1')
      await vi.waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })

    it('does not delete the tag when the confirmation is cancelled', async () => {
      const deleteTagSpy = vi.fn(() => Promise.resolve())
      renderTagsPage(buildContainer({ deleteTag: { execute: deleteTagSpy } }))
      await screen.findByText('VIP')

      await userEvent.click(screen.getByRole('button', { name: /excluir/i }))
      const alertDialog = await screen.findByRole('alertdialog')
      await userEvent.click(within(alertDialog).getByRole('button', { name: /cancelar/i }))

      expect(deleteTagSpy).not.toHaveBeenCalled()
      await vi.waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })

    it('shows an error and keeps the dialog open when deletion fails', async () => {
      const deleteTagSpy = vi.fn(() => Promise.reject(new Error('Tag is in use.')))
      renderTagsPage(buildContainer({ deleteTag: { execute: deleteTagSpy } }))
      await screen.findByText('VIP')

      await userEvent.click(screen.getByRole('button', { name: /excluir/i }))
      const alertDialog = await screen.findByRole('alertdialog')
      await userEvent.click(within(alertDialog).getByRole('button', { name: 'Excluir' }))

      expect(await within(alertDialog).findByText('Tag is in use.')).toBeInTheDocument()
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
  })

  describe('search', () => {
    it('refetches with the debounced search term after the user stops typing', async () => {
      const listTagsSpy = vi.fn(() => Promise.resolve([vipTag]))
      renderTagsPage(buildContainer({ listTags: { execute: listTagsSpy } }))
      await screen.findByText('VIP')
      listTagsSpy.mockClear()

      vi.useFakeTimers()
      try {
        fireEvent.change(screen.getByLabelText('Buscar etiqueta por nome'), {
          target: { value: 'vip' },
        })
        expect(listTagsSpy).not.toHaveBeenCalled()

        await act(async () => {
          await vi.advanceTimersByTimeAsync(300)
        })

        expect(listTagsSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, { search: 'vip' })
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('security', () => {
    it.each(MALICIOUS_PAYLOADS)('renders "%s" as inert text, not markup', async payload => {
      const maliciousTag = Tag.create({ id: 'malicious-1', name: payload, color: '#0d9488' })
      renderTagsPage(
        buildContainer({ listTags: { execute: vi.fn(() => Promise.resolve([maliciousTag])) } }),
      )

      expect(await screen.findByText(payload)).toBeInTheDocument()
      expect(document.querySelector('script')).not.toBeInTheDocument()
      expect(document.querySelector('img[onerror]')).not.toBeInTheDocument()
    })
  })
})
