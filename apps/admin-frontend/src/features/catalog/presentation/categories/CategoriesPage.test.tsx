import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoriesPage } from '@/features/catalog/presentation/categories/CategoriesPage'
import { AppContainerContext } from '@/app/providers/AppContainerContext'
import { AuthProvider } from '@/features/auth'
import type { AppContainer, CatalogFacade } from '@/app/composition/container'
import { Category } from '@/features/catalog/domain/entities/Category'
import { Tenant } from '@/features/auth'
import { User } from '@/features/auth'
import { MALICIOUS_PAYLOADS } from '@/test/fixtures/maliciousPayloads'
import { createFakeAppContainer } from '@/test/fixtures/createFakeAppContainer'
import { AppError } from '@/shared/application/AppError'

const tenant = Tenant.create('tenant-123')
const tenantContext = { tenant, user: User.create({ id: 'user-1', tenant }) }
const massagensCategory = Category.create({ id: 'category-1', name: 'Massagens' })

function buildContainer(overrides: Partial<CatalogFacade> = {}): AppContainer {
  return createFakeAppContainer({
    auth: { getCurrentSession: { execute: vi.fn(() => Promise.resolve(tenantContext)) } },
    catalog: {
      listCategories: { execute: vi.fn(() => Promise.resolve([massagensCategory])) },
      createCategory: { execute: vi.fn(() => Promise.resolve(massagensCategory)) },
      updateCategory: { execute: vi.fn(() => Promise.resolve(massagensCategory)) },
      deleteCategory: { execute: vi.fn(() => Promise.resolve()) },
      ...overrides,
    },
  })
}

function renderCategoriesPage(container: AppContainer): void {
  render(
    <AppContainerContext.Provider value={container}>
      <AuthProvider>
        <CategoriesPage />
      </AuthProvider>
    </AppContainerContext.Provider>,
  )
}

describe('CategoriesPage', () => {
  it('renders the category list once loaded', async () => {
    renderCategoriesPage(buildContainer())

    expect(await screen.findByText('Massagens')).toBeInTheDocument()
  })

  it('shows an empty state when there are no categories', async () => {
    renderCategoriesPage(
      buildContainer({ listCategories: { execute: vi.fn(() => Promise.resolve([])) } }),
    )

    expect(await screen.findByText(/nenhuma categoria ainda/i)).toBeInTheDocument()
  })

  it('shows an error state when loading categories fails', async () => {
    renderCategoriesPage(
      buildContainer({
        listCategories: { execute: vi.fn(() => Promise.reject(new Error('network down'))) },
      }),
    )

    expect(
      await screen.findByText(/não foi possível carregar as categorias: network down/i),
    ).toBeInTheDocument()
  })

  it('creates a category through the form and refreshes the list', async () => {
    const createCategorySpy = vi.fn(() => Promise.resolve(massagensCategory))
    const listCategoriesSpy = vi.fn(() => Promise.resolve([massagensCategory]))
    renderCategoriesPage(
      buildContainer({
        createCategory: { execute: createCategorySpy },
        listCategories: { execute: listCategoriesSpy },
      }),
    )
    await screen.findByText('Massagens')
    listCategoriesSpy.mockClear()

    await userEvent.click(screen.getByRole('button', { name: /nova categoria/i }))
    await userEvent.type(screen.getByLabelText('Nome'), 'Estética')
    await userEvent.click(screen.getByRole('button', { name: /criar categoria/i }))

    expect(createCategorySpy).toHaveBeenCalledExactlyOnceWith(tenantContext, { name: 'Estética' })
    await vi.waitFor(() => {
      expect(listCategoriesSpy).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole('button', { name: /criar categoria/i })).not.toBeInTheDocument()
  })

  it('closes the form normally when creation succeeds even if the follow-up refetch fails', async () => {
    // The mutation itself succeeded - a failed background refresh afterward
    // must not be reported to the user as "creation failed".
    const esteticaCategory = Category.create({ id: 'category-2', name: 'Estética' })
    const createCategorySpy = vi.fn(() => Promise.resolve(esteticaCategory))
    const listCategoriesSpy = vi
      .fn()
      .mockResolvedValueOnce([massagensCategory])
      .mockRejectedValueOnce(new Error('network down'))
    renderCategoriesPage(
      buildContainer({
        createCategory: { execute: createCategorySpy },
        listCategories: { execute: listCategoriesSpy },
      }),
    )
    await screen.findByText('Massagens')

    await userEvent.click(screen.getByRole('button', { name: /nova categoria/i }))
    await userEvent.type(screen.getByLabelText('Nome'), 'Estética')
    await userEvent.click(screen.getByRole('button', { name: /criar categoria/i }))

    // The dialog closes as normal - the create call itself succeeded.
    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    // The newly created category is visible immediately (optimistic insert),
    // alongside the last known-good list, instead of being lost when the
    // background refresh below fails.
    expect(screen.getByText('Massagens')).toBeInTheDocument()
    expect(screen.getByText('Estética')).toBeInTheDocument()
    expect(
      await screen.findByText(/não foi possível atualizar a lista de categorias/i),
    ).toBeInTheDocument()
  })

  it('shows a validation error and does not submit when the name is blank', async () => {
    const createCategorySpy = vi.fn(() => Promise.resolve(massagensCategory))
    renderCategoriesPage(buildContainer({ createCategory: { execute: createCategorySpy } }))
    await screen.findByText('Massagens')

    await userEvent.click(screen.getByRole('button', { name: /nova categoria/i }))
    await userEvent.click(screen.getByRole('button', { name: /criar categoria/i }))

    expect(
      await screen.findByText(/o nome da categoria deve ter entre 1 e 60 caracteres/i),
    ).toBeInTheDocument()
    expect(createCategorySpy).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Nome'), 'Estética')
    expect(
      screen.queryByText(/o nome da categoria deve ter entre 1 e 60 caracteres/i),
    ).not.toBeInTheDocument()
  })

  it('does not carry a previously edited category into a freshly opened create dialog', async () => {
    renderCategoriesPage(buildContainer())
    await screen.findByText('Massagens')

    await userEvent.click(screen.getByRole('button', { name: /editar/i }))
    const editDialog = await screen.findByRole('dialog')
    expect(within(editDialog).getByText('Editar categoria')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Massagens')
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))

    await userEvent.click(screen.getByRole('button', { name: /nova categoria/i }))
    const createDialog = await screen.findByRole('dialog')
    expect(within(createDialog).getByText('Nova categoria')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('')
  })

  it('shows a form error when creation fails and keeps the form open', async () => {
    renderCategoriesPage(
      buildContainer({
        createCategory: {
          execute: vi.fn(() => Promise.reject(new Error('Category name is already in use.'))),
        },
      }),
    )
    await screen.findByText('Massagens')

    await userEvent.click(screen.getByRole('button', { name: /nova categoria/i }))
    await userEvent.type(screen.getByLabelText('Nome'), 'Massagens')
    await userEvent.click(screen.getByRole('button', { name: /criar categoria/i }))

    expect(await screen.findByText('Category name is already in use.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /criar categoria/i })).toBeInTheDocument()
  })

  describe('structured server errors', () => {
    it('maps a validation field error from the API onto the Nome field and focuses it', async () => {
      const validationError = new AppError({
        code: 'validation',
        message: 'Ocorreram erros de validação.',
        retryable: false,
        rawFieldErrors: { Name: 'O nome é obrigatório.' },
      })
      renderCategoriesPage(
        buildContainer({
          createCategory: { execute: vi.fn(() => Promise.reject(validationError)) },
        }),
      )
      await screen.findByText('Massagens')

      await userEvent.click(screen.getByRole('button', { name: /nova categoria/i }))
      await userEvent.type(screen.getByLabelText('Nome'), 'Qualquer')
      await userEvent.click(screen.getByRole('button', { name: /criar categoria/i }))

      const fieldError = await screen.findByText('O nome é obrigatório.')
      expect(fieldError).toHaveAttribute('role', 'alert')
      expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByLabelText('Nome')).toHaveFocus()
      // A validation ProblemDetails fully mapped to a field has no unmapped
      // remainder - it must not also duplicate as a global banner message.
      expect(screen.queryByText('Ocorreram erros de validação.')).not.toBeInTheDocument()
    })

    it('maps a duplicate-name conflict code from the API onto the Nome field', async () => {
      const conflictError = new AppError({
        code: 'conflict',
        message: 'Já existe uma categoria com esse nome.',
        retryable: false,
        backendCode: 'Category.DuplicateName',
      })
      renderCategoriesPage(
        buildContainer({ createCategory: { execute: vi.fn(() => Promise.reject(conflictError)) } }),
      )
      await screen.findByText('Massagens')

      await userEvent.click(screen.getByRole('button', { name: /nova categoria/i }))
      await userEvent.type(screen.getByLabelText('Nome'), 'Massagens')
      await userEvent.click(screen.getByRole('button', { name: /criar categoria/i }))

      const fieldError = await screen.findByText('Já existe uma categoria com esse nome.')
      expect(fieldError).toHaveAttribute('role', 'alert')
      expect(screen.getByLabelText('Nome')).toHaveFocus()
    })
  })

  it('edits a category through the inline form', async () => {
    const updateCategorySpy = vi.fn(() => Promise.resolve(massagensCategory))
    renderCategoriesPage(buildContainer({ updateCategory: { execute: updateCategorySpy } }))
    await screen.findByText('Massagens')

    await userEvent.click(screen.getByRole('button', { name: /editar/i }))
    const nameInput = screen.getByLabelText('Nome')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Renamed')
    await userEvent.click(screen.getByRole('button', { name: /salvar alterações/i }))

    expect(updateCategorySpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'category-1', {
      name: 'Renamed',
    })
  })

  describe('delete', () => {
    it('shows a confirmation dialog naming the category before deleting', async () => {
      renderCategoriesPage(buildContainer())
      await screen.findByText('Massagens')

      await userEvent.click(screen.getByRole('button', { name: /excluir/i }))

      const alertDialog = await screen.findByRole('alertdialog')
      expect(within(alertDialog).getByText(/excluir categoria/i)).toBeInTheDocument()
      expect(within(alertDialog).getByText(/"Massagens"/)).toBeInTheDocument()
    })

    it('deletes the category when the confirmation is accepted', async () => {
      const deleteCategorySpy = vi.fn(() => Promise.resolve())
      renderCategoriesPage(buildContainer({ deleteCategory: { execute: deleteCategorySpy } }))
      await screen.findByText('Massagens')

      await userEvent.click(screen.getByRole('button', { name: /excluir/i }))
      const alertDialog = await screen.findByRole('alertdialog')
      await userEvent.click(within(alertDialog).getByRole('button', { name: 'Excluir' }))

      expect(deleteCategorySpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'category-1')
      await vi.waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })

    it('does not delete the category when the confirmation is cancelled', async () => {
      const deleteCategorySpy = vi.fn(() => Promise.resolve())
      renderCategoriesPage(buildContainer({ deleteCategory: { execute: deleteCategorySpy } }))
      await screen.findByText('Massagens')

      await userEvent.click(screen.getByRole('button', { name: /excluir/i }))
      const alertDialog = await screen.findByRole('alertdialog')
      await userEvent.click(within(alertDialog).getByRole('button', { name: /cancelar/i }))

      expect(deleteCategorySpy).not.toHaveBeenCalled()
      await vi.waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })

    it('shows an error and keeps the dialog open when deletion fails', async () => {
      const deleteCategorySpy = vi.fn(() => Promise.reject(new Error('Category is in use.')))
      renderCategoriesPage(buildContainer({ deleteCategory: { execute: deleteCategorySpy } }))
      await screen.findByText('Massagens')

      await userEvent.click(screen.getByRole('button', { name: /excluir/i }))
      const alertDialog = await screen.findByRole('alertdialog')
      await userEvent.click(within(alertDialog).getByRole('button', { name: 'Excluir' }))

      expect(await within(alertDialog).findByText('Category is in use.')).toBeInTheDocument()
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
  })

  describe('search', () => {
    it('refetches with the debounced search term after the user stops typing', async () => {
      const listCategoriesSpy = vi.fn(() => Promise.resolve([massagensCategory]))
      renderCategoriesPage(buildContainer({ listCategories: { execute: listCategoriesSpy } }))
      await screen.findByText('Massagens')
      listCategoriesSpy.mockClear()

      vi.useFakeTimers()
      try {
        fireEvent.change(screen.getByLabelText('Buscar categoria por nome'), {
          target: { value: 'massa' },
        })
        expect(listCategoriesSpy).not.toHaveBeenCalled()

        await act(async () => {
          await vi.advanceTimersByTimeAsync(300)
        })

        expect(listCategoriesSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, {
          search: 'massa',
        })
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('security', () => {
    it.each(MALICIOUS_PAYLOADS)('renders "%s" as inert text, not markup', async payload => {
      const maliciousCategory = Category.create({ id: 'malicious-1', name: payload })
      renderCategoriesPage(
        buildContainer({
          listCategories: { execute: vi.fn(() => Promise.resolve([maliciousCategory])) },
        }),
      )

      expect(await screen.findByText(payload)).toBeInTheDocument()
      expect(document.querySelector('script')).not.toBeInTheDocument()
      expect(document.querySelector('img[onerror]')).not.toBeInTheDocument()
    })
  })
})
