import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { TagsPage } from '@/features/catalog/presentation/tags/TagsPage'
import { TagEditorDialog } from '@/features/catalog/presentation/tags/pages/TagEditorDialog'
import { AppContainerContext } from '@/app/providers/AppContainerContext'
import { AuthProvider } from '@/features/auth'
import type { AppContainer, CatalogFacade } from '@/app/composition/container'
import { Tag } from '@/features/catalog/domain/entities/Tag'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import { MALICIOUS_PAYLOADS } from '@/test/fixtures/maliciousPayloads'
import { createFakeAppContainer } from '@/test/fixtures/createFakeAppContainer'
import { AppError } from '@/shared/application/AppError'
import { success, failure } from '@/shared/application/Result'

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
      listTags: { execute: vi.fn(() => Promise.resolve(success([vipTag]))) },
      createTag: { execute: vi.fn(() => Promise.resolve(success(vipTag))) },
      updateTag: { execute: vi.fn(() => Promise.resolve(success(vipTag))) },
      deleteTag: { execute: vi.fn(() => Promise.resolve(success(undefined))) },
      ...overrides,
    },
  })
}

function renderTagsPage(container: AppContainer): void {
  const routes: RouteObject[] = [
    {
      path: '/tags',
      element: <TagsPage />,
      children: [
        { path: 'new', element: <TagEditorDialog /> },
        { path: ':id/edit', element: <TagEditorDialog /> },
      ],
    },
  ]
  const router = createMemoryRouter(routes, { initialEntries: ['/tags'] })

  render(
    <AppContainerContext.Provider value={container}>
      <AuthProvider>
        <RouterProvider router={router} />
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
    renderTagsPage(buildContainer({ listTags: { execute: vi.fn(() => Promise.resolve(success([]))) } }))

    expect(await screen.findByText(/nenhuma etiqueta ainda/i)).toBeInTheDocument()
  })

  it('shows an error state when loading tags fails', async () => {
    renderTagsPage(
      buildContainer({
        listTags: {
          execute: vi.fn(() =>
            Promise.resolve(
              failure(new AppError({ code: 'network', message: 'network down', retryable: true })),
            ),
          ),
        },
      }),
    )

    expect(
      await screen.findByText(/não foi possível carregar as etiquetas: network down/i),
    ).toBeInTheDocument()
  })

  it('shows the generic curated message, never a raw error message, when an unexpected error occurs', async () => {
    renderTagsPage(
      buildContainer({
        listTags: {
          // A repository always resolves Result<T, AppError>, but toUiError's
          // fallback branch (for anything that isn't an AppError instance) is
          // still defense-in-depth worth covering here - the cast simulates
          // that contract being violated internally.
          execute: vi.fn(() =>
            Promise.resolve(
              failure(new Error('undefined.trim is not a function') as unknown as AppError),
            ),
          ),
        },
      }),
    )

    expect(
      await screen.findByText(
        /não foi possível carregar as etiquetas: ocorreu um erro inesperado/i,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/undefined\.trim/i)).not.toBeInTheDocument()
  })

  it('creates a tag through the form and refreshes the list', async () => {
    const createTagSpy = vi.fn(() => Promise.resolve(success(vipTag)))
    const listTagsSpy = vi.fn(() => Promise.resolve(success([vipTag])))
    renderTagsPage(
      buildContainer({ createTag: { execute: createTagSpy }, listTags: { execute: listTagsSpy } }),
    )
    await screen.findByText('VIP')
    listTagsSpy.mockClear()

    await userEvent.click(screen.getByRole('button', { name: /nova etiqueta/i }))
    await userEvent.type(screen.getByLabelText('Nome'), 'Returning')
    await userEvent.click(screen.getByRole('radio', { name: 'Cor #ef4444' }))
    await userEvent.click(screen.getByRole('button', { name: /criar etiqueta/i }))

    expect(createTagSpy).toHaveBeenCalledExactlyOnceWith({
      name: 'Returning',
      color: '#ef4444',
    })
    await vi.waitFor(() => {
      expect(listTagsSpy).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole('button', { name: /criar etiqueta/i })).not.toBeInTheDocument()
  })

  it('shows a validation error and does not submit when the name is blank', async () => {
    const createTagSpy = vi.fn(() => Promise.resolve(success(vipTag)))
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
          execute: vi.fn(() =>
            Promise.resolve(
              failure(new Error('Tag name is already in use.') as unknown as AppError),
            ),
          ),
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
        buildContainer({
          createTag: { execute: vi.fn(() => Promise.resolve(failure(validationError))) },
        }),
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
        buildContainer({
          createTag: { execute: vi.fn(() => Promise.resolve(failure(conflictError))) },
        }),
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
    const updateTagSpy = vi.fn(() => Promise.resolve(success(vipTag)))
    renderTagsPage(buildContainer({ updateTag: { execute: updateTagSpy } }))
    await screen.findByText('VIP')

    await userEvent.click(screen.getByRole('button', { name: /editar/i }))
    const nameInput = screen.getByLabelText('Nome')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Renamed')
    await userEvent.click(screen.getByRole('button', { name: /salvar alterações/i }))

    expect(updateTagSpy).toHaveBeenCalledExactlyOnceWith('tag-1', {
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
      const deleteTagSpy = vi.fn(() => Promise.resolve(success(undefined)))
      renderTagsPage(buildContainer({ deleteTag: { execute: deleteTagSpy } }))
      await screen.findByText('VIP')

      await userEvent.click(screen.getByRole('button', { name: /excluir/i }))
      const alertDialog = await screen.findByRole('alertdialog')
      await userEvent.click(within(alertDialog).getByRole('button', { name: 'Excluir' }))

      expect(deleteTagSpy).toHaveBeenCalledExactlyOnceWith('tag-1')
      await vi.waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })

    it('does not delete the tag when the confirmation is cancelled', async () => {
      const deleteTagSpy = vi.fn(() => Promise.resolve(success(undefined)))
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
      const deleteTagSpy = vi.fn(() =>
        Promise.resolve(failure(new Error('Tag is in use.') as unknown as AppError)),
      )
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
      const listTagsSpy = vi.fn(() => Promise.resolve(success([vipTag])))
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

        expect(listTagsSpy).toHaveBeenCalledExactlyOnceWith({ search: 'vip' })
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('security', () => {
    it.each(MALICIOUS_PAYLOADS)('renders "%s" as inert text, not markup', async payload => {
      const maliciousTag = Tag.create({ id: 'malicious-1', name: payload, color: '#0d9488' })
      renderTagsPage(
        buildContainer({
          listTags: { execute: vi.fn(() => Promise.resolve(success([maliciousTag]))) },
        }),
      )

      expect(await screen.findByText(payload)).toBeInTheDocument()
      expect(document.querySelector('script')).not.toBeInTheDocument()
      expect(document.querySelector('img[onerror]')).not.toBeInTheDocument()
    })
  })
})
