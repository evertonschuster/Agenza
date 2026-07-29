import { act, fireEvent, render, screen, within, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AppContainerContext } from '@/app/providers/AppContainerContext'
import type { AppContainer, CatalogFacade } from '@/app/composition/container'
import { AuthProvider, Tenant, User } from '@/features/auth'
import { Category } from '@/features/catalog/domain/entities/Category'
import { CategoryEditorDialog } from '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/CategoryEditorDialog'
import { CategoriesListPage } from '@/features/catalog/presentation/categories/pages/CategoriesListPage/CategoriesListPage'
import { AppError } from '@/shared/application/AppError'
import { success, failure } from '@/shared/application/Result'
import { createFakeAppContainer } from '@/test/fixtures/createFakeAppContainer'
import { MALICIOUS_PAYLOADS } from '@/test/fixtures/maliciousPayloads'

const tenant = Tenant.create('tenant-123')
const tenantContext = { tenant, user: User.create({ id: 'user-1', tenant }) }
const categoryFixture = Category.create({ id: 'category-1', name: 'Massagens' })

function buildContainer(overrides: Partial<CatalogFacade> = {}): AppContainer {
  return createFakeAppContainer({
    // AuthProvider hydrates its own session/tenant state on mount regardless
    // of whether the catalog facade below needs tenantContext.
    auth: { getCurrentSession: { execute: vi.fn(() => Promise.resolve(tenantContext)) } },
    catalog: {
      listCategories: { execute: vi.fn(() => Promise.resolve(success([categoryFixture]))) },
      createCategory: { execute: vi.fn(() => Promise.resolve(success(categoryFixture))) },
      updateCategory: { execute: vi.fn(() => Promise.resolve(success(categoryFixture))) },
      deleteCategory: { execute: vi.fn(() => Promise.resolve(success(undefined))) },
      ...overrides,
    },
  })
}

function renderCategoryRoute(path: string, container: AppContainer): RenderResult {
  const routes: RouteObject[] = [
    {
      path: '/categories',
      element: <CategoriesListPage />,
      children: [
        { path: 'new', element: <CategoryEditorDialog /> },
        { path: ':id/edit', element: <CategoryEditorDialog /> },
      ],
    },
  ]
  const router = createMemoryRouter(routes, { initialEntries: [path] })

  return render(
    <AppContainerContext.Provider value={container}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </AppContainerContext.Provider>,
  )
}

describe('Categories routes', () => {
  it('opens creation in a dialog without leaving the list', async () => {
    renderCategoryRoute('/categories', buildContainer())

    expect(await screen.findByText('Massagens')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /nova categoria/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Nova categoria' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Nome')).toHaveValue('')
    expect(screen.getByText('Massagens')).toBeInTheDocument()
  })

  it('opens creation directly from its URL over the list', async () => {
    renderCategoryRoute('/categories/new', buildContainer())

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByText('Massagens')).toBeInTheDocument()
  })

  it('preserves list state when the creation route closes', async () => {
    renderCategoryRoute('/categories', buildContainer())

    await userEvent.type(screen.getByLabelText('Buscar categoria por nome'), 'massa')
    await userEvent.click(screen.getByRole('button', { name: /nova categoria/i }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.getByLabelText('Buscar categoria por nome')).toHaveValue('massa')
    expect(screen.getByText('Massagens')).toBeInTheDocument()
  })

  it('creates a category through the dialog and keeps the listing route mounted', async () => {
    const listCategoriesSpy = vi.fn(() => Promise.resolve(success([categoryFixture])))
    const createCategorySpy = vi.fn(() => Promise.resolve(success(categoryFixture)))
    renderCategoryRoute(
      '/categories',
      buildContainer({
        listCategories: { execute: listCategoriesSpy },
        createCategory: { execute: createCategorySpy },
      }),
    )

    await screen.findByText('Massagens')
    listCategoriesSpy.mockClear()
    await userEvent.click(screen.getByRole('button', { name: /nova categoria/i }))

    await userEvent.type(screen.getByLabelText('Nome'), 'Estética')
    await userEvent.click(screen.getByRole('button', { name: /criar categoria/i }))

    expect(createCategorySpy).toHaveBeenCalledExactlyOnceWith({
      name: 'Estética',
    })
    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: 'Categorias' })).toBeInTheDocument()
    // The list and the editor now share one useCategories source (docs/adr/012)
    // - creating refreshes the same visible list, not just the editor's own copy.
    await vi.waitFor(() => {
      expect(listCategoriesSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('uses compact record-specific actions and navigates editing to its route', async () => {
    renderCategoryRoute('/categories', buildContainer())

    await screen.findByText('Massagens')
    await userEvent.click(screen.getByRole('button', { name: 'Editar categoria Massagens' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Editar categoria' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Massagens')
    expect(screen.getByText('Massagens')).toBeInTheDocument()
  })

  it('loads the category identified by the edit route and updates it', async () => {
    const updateCategorySpy = vi.fn(() => Promise.resolve(success(categoryFixture)))
    renderCategoryRoute(
      '/categories/category-1/edit',
      buildContainer({ updateCategory: { execute: updateCategorySpy } }),
    )

    const nameInput = await screen.findByLabelText('Nome')
    expect(nameInput).toHaveValue('Massagens')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Terapias')
    await userEvent.click(screen.getByRole('button', { name: /salvar alterações/i }))

    expect(updateCategorySpy).toHaveBeenCalledExactlyOnceWith('category-1', {
      name: 'Terapias',
    })
    expect(await screen.findByRole('heading', { name: 'Categorias' })).toBeInTheDocument()
  })

  it('shows a not-found state when the edit route id is not in the tenant list', async () => {
    renderCategoryRoute(
      '/categories/missing/edit',
      buildContainer({ listCategories: { execute: vi.fn(() => Promise.resolve(success([]))) } }),
    )

    expect(await screen.findByText('Categoria não encontrada.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
  })

  it('retries when loading the category for editing fails', async () => {
    const listCategoriesSpy = vi
      .fn()
      .mockResolvedValueOnce(
        failure(
          new AppError({
            code: 'network',
            message: 'Não foi possível acessar o serviço.',
            retryable: true,
          }),
        ),
      )
      .mockResolvedValueOnce(success([categoryFixture]))
    renderCategoryRoute(
      '/categories/category-1/edit',
      buildContainer({ listCategories: { execute: listCategoriesSpy } }),
    )

    expect(
      await screen.findByText(
        /não foi possível carregar a categoria: não foi possível acessar o serviço/i,
      ),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /tentar novamente/i }))

    expect(await screen.findByLabelText('Nome')).toHaveValue('Massagens')
    expect(listCategoriesSpy).toHaveBeenCalledTimes(2)
  })

  it('maps a structured creation error to the name field and keeps the route open', async () => {
    const conflictError = new AppError({
      code: 'conflict',
      message: 'Já existe uma categoria com esse nome.',
      retryable: false,
      backendCode: 'Category.DuplicateName',
    })
    renderCategoryRoute(
      '/categories',
      buildContainer({
        createCategory: { execute: vi.fn(() => Promise.resolve(failure(conflictError))) },
      }),
    )

    await screen.findByText('Massagens')
    await userEvent.click(screen.getByRole('button', { name: /nova categoria/i }))
    await userEvent.type(screen.getByLabelText('Nome'), 'Massagens')
    await userEvent.click(screen.getByRole('button', { name: /criar categoria/i }))

    expect(await screen.findByText('Já existe uma categoria com esse nome.')).toHaveAttribute(
      'role',
      'alert',
    )
    expect(screen.getByLabelText('Nome')).toHaveFocus()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('confirms deletion from the list and refreshes the visible data source', async () => {
    const listCategoriesSpy = vi
      .fn()
      .mockResolvedValueOnce(success([categoryFixture]))
      .mockResolvedValueOnce(success([]))
    const deleteCategorySpy = vi.fn(() => Promise.resolve(success(undefined)))
    renderCategoryRoute(
      '/categories',
      buildContainer({
        listCategories: { execute: listCategoriesSpy },
        deleteCategory: { execute: deleteCategorySpy },
      }),
    )
    await screen.findByText('Massagens')

    await userEvent.click(screen.getByRole('button', { name: /excluir/i }))
    const alertDialog = await screen.findByRole('alertdialog')
    expect(within(alertDialog).getByText(/"Massagens"/)).toBeInTheDocument()
    await userEvent.click(within(alertDialog).getByRole('button', { name: 'Excluir' }))

    expect(deleteCategorySpy).toHaveBeenCalledExactlyOnceWith('category-1')
    expect(await screen.findByText(/nenhuma categoria ainda/i)).toBeInTheDocument()
    expect(screen.queryByText('Massagens')).not.toBeInTheDocument()
  })

  it('debounces searches on the list route', async () => {
    const listCategoriesSpy = vi.fn(() => Promise.resolve(success([categoryFixture])))
    renderCategoryRoute(
      '/categories',
      buildContainer({ listCategories: { execute: listCategoriesSpy } }),
    )
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

      expect(listCategoriesSpy).toHaveBeenCalledExactlyOnceWith({
        search: 'massa',
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it.each(MALICIOUS_PAYLOADS)('renders the category name "%s" as inert text', async payload => {
    const category = Category.create({ id: 'malicious-1', name: payload })
    renderCategoryRoute(
      '/categories',
      buildContainer({
        listCategories: { execute: vi.fn(() => Promise.resolve(success([category]))) },
      }),
    )

    expect(await screen.findByText(payload)).toBeInTheDocument()
    expect(document.querySelector('script')).not.toBeInTheDocument()
    expect(document.querySelector('img[onerror]')).not.toBeInTheDocument()
  })

  it.each([
    ['/categories/new', 'Nova categoria'],
    ['/categories/category-1/edit', 'Editar categoria'],
  ])('has no detectable accessibility violations at %s', async (path, title) => {
    const { container } = renderCategoryRoute(path, buildContainer())
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByRole('heading', { name: title })).toBeInTheDocument()

    expect(await axe(container)).toHaveNoViolations()
  })
})
