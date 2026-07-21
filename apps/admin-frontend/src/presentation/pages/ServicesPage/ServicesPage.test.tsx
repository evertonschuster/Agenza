import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ServicesPage } from './ServicesPage'
import { AppContainerContext } from '../../providers/AppContainerContext'
import type { AppContainer } from '../../../composition/container'
import { Service } from '../../../domain/entities/Service'
import { Category } from '../../../domain/entities/Category'
import { Tag, TAG_COLOR_PALETTE } from '../../../domain/entities/Tag'
import { Tenant } from '../../../domain/value-objects/Tenant'
import { User } from '../../../domain/entities/User'
import { MALICIOUS_PAYLOADS } from '../../../test/fixtures/maliciousPayloads'

const tenant = Tenant.create('tenant-123')
const tenantContext = { tenant, user: User.create({ id: 'user-1', tenant }) }
const massagemService = Service.create({
  id: 'service-1',
  code: 1001,
  name: 'Massagem relaxante',
  description: 'Uma massagem relaxante de corpo inteiro',
  durationMinutes: 60,
  minDurationMinutes: 30,
  maxDurationMinutes: 90,
  price: 150,
  maxDiscountPercentage: 10,
  categoryId: 'category-1',
  categoryName: 'Massagens',
  tags: [{ id: 'tag-1', name: 'VIP', color: '#0d9488' }],
})
const massagensCategory = Category.create({ id: 'category-1', name: 'Massagens' })
const vipTag = Tag.create({ id: 'tag-1', name: 'VIP', color: '#0d9488' })

interface FakeUseCases {
  getCurrentSession: { execute: () => Promise<typeof tenantContext | null> }
  listServices: {
    execute: (
      ...args: unknown[]
    ) => Promise<{ services: Service[]; totalCount: number; page: number; pageSize: number }>
  }
  createService: { execute: (...args: unknown[]) => Promise<Service> }
  updateService: { execute: (...args: unknown[]) => Promise<Service> }
  deleteService: { execute: (...args: unknown[]) => Promise<void> }
  listCategories: { execute: () => Promise<Category[]> }
  createCategory: { execute: (...args: unknown[]) => Promise<Category> }
  listTags: { execute: () => Promise<Tag[]> }
  createTag: { execute: (...args: unknown[]) => Promise<Tag> }
}

function buildContainer(overrides: Partial<FakeUseCases> = {}): AppContainer {
  return {
    useCases: {
      initiateLogin: { execute: vi.fn(() => Promise.resolve()) },
      handleAuthCallback: { execute: vi.fn(() => Promise.reject(new Error('not used'))) },
      logout: { execute: vi.fn(() => Promise.resolve()) },
      getCurrentSession: { execute: vi.fn(() => Promise.resolve(tenantContext)) },
      listServices: {
        execute: vi.fn(() =>
          Promise.resolve({ services: [massagemService], totalCount: 1, page: 1, pageSize: 20 }),
        ),
      },
      createService: { execute: vi.fn(() => Promise.resolve(massagemService)) },
      updateService: { execute: vi.fn(() => Promise.resolve(massagemService)) },
      deleteService: { execute: vi.fn(() => Promise.resolve()) },
      listCategories: { execute: vi.fn(() => Promise.resolve([massagensCategory])) },
      createCategory: { execute: vi.fn(() => Promise.resolve(massagensCategory)) },
      updateCategory: { execute: vi.fn(() => Promise.resolve(massagensCategory)) },
      deleteCategory: { execute: vi.fn(() => Promise.resolve()) },
      listTags: { execute: vi.fn(() => Promise.resolve([vipTag])) },
      createTag: { execute: vi.fn(() => Promise.resolve(vipTag)) },
      updateTag: { execute: vi.fn(() => Promise.resolve(vipTag)) },
      deleteTag: { execute: vi.fn(() => Promise.resolve()) },
      ...overrides,
    },
  } as unknown as AppContainer
}

function renderServicesPage(container: AppContainer): void {
  render(
    <AppContainerContext.Provider value={container}>
      <ServicesPage />
    </AppContainerContext.Provider>,
  )
}

// The InlineCreatePopover's content is portaled to document.body as a
// sibling of the dialog, not a DOM descendant of it, so its fields must be
// queried through this scoped container rather than `within(dialog)`.
function getPopoverContent(title: string): HTMLElement {
  const heading = screen.getByText(title, { selector: 'p' })
  const content = heading.closest('[data-slot="popover-content"]')
  if (content === null) {
    throw new Error(`Expected the "${title}" popover to be open`)
  }
  return content as HTMLElement
}

describe('ServicesPage', () => {
  it('renders the service list once loaded', async () => {
    renderServicesPage(buildContainer())

    expect(await screen.findByText('Massagem relaxante')).toBeInTheDocument()
    expect(screen.getByText('1001')).toBeInTheDocument()
    expect(screen.getByText('Massagens')).toBeInTheDocument()
    expect(screen.getByText('60 min (30–90)')).toBeInTheDocument()
    expect(screen.getByText('VIP')).toBeInTheDocument()
  })

  it('shows an empty state when there are no services', async () => {
    renderServicesPage(
      buildContainer({
        listServices: {
          execute: vi.fn(() =>
            Promise.resolve({ services: [], totalCount: 0, page: 1, pageSize: 20 }),
          ),
        },
      }),
    )

    expect(await screen.findByText(/nenhum serviço ainda/i)).toBeInTheDocument()
  })

  it('shows an error state when loading services fails', async () => {
    renderServicesPage(
      buildContainer({
        listServices: { execute: vi.fn(() => Promise.reject(new Error('network down'))) },
      }),
    )

    expect(
      await screen.findByText(/não foi possível carregar os serviços: network down/i),
    ).toBeInTheDocument()
  })

  it('creates a service through the form and refreshes the list', async () => {
    const createServiceSpy = vi.fn(() => Promise.resolve(massagemService))
    const listServicesSpy = vi.fn(() =>
      Promise.resolve({ services: [massagemService], totalCount: 1, page: 1, pageSize: 20 }),
    )
    renderServicesPage(
      buildContainer({
        createService: { execute: createServiceSpy },
        listServices: { execute: listServicesSpy },
      }),
    )
    await screen.findByText('Massagem relaxante')
    listServicesSpy.mockClear()

    await userEvent.click(screen.getByRole('button', { name: /novo serviço/i }))
    await userEvent.type(screen.getByLabelText(/^nome$/i), 'Corte de cabelo')
    await userEvent.type(screen.getByLabelText(/duração mínima/i), '15')
    await userEvent.type(screen.getByLabelText(/^duração \(min\)$/i), '30')
    await userEvent.type(screen.getByLabelText(/duração máxima/i), '45')
    await userEvent.type(screen.getByLabelText(/preço/i), '80')
    await userEvent.type(screen.getByLabelText(/desconto máximo/i), '5')
    const submitButton = screen.getByRole('button', { name: /criar serviço/i })
    // The last field's blur kicks off one more async validation pass
    // (mode: 'onTouched') - wait for it to resolve and re-enable the button
    // before clicking, instead of racing it.
    await vi.waitFor(() => {
      expect(submitButton).toBeEnabled()
    })
    await userEvent.click(submitButton)

    expect(createServiceSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, {
      name: 'Corte de cabelo',
      description: null,
      durationMinutes: 30,
      minDurationMinutes: 15,
      maxDurationMinutes: 45,
      price: 80,
      maxDiscountPercentage: 5,
      categoryId: null,
      tagIds: [],
    })
    await vi.waitFor(() => {
      expect(listServicesSpy).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole('button', { name: /criar serviço/i })).not.toBeInTheDocument()
  })

  it('shows a validation error and does not submit when the duration range is invalid', async () => {
    const createServiceSpy = vi.fn(() => Promise.resolve(massagemService))
    renderServicesPage(buildContainer({ createService: { execute: createServiceSpy } }))
    await screen.findByText('Massagem relaxante')

    await userEvent.click(screen.getByRole('button', { name: /novo serviço/i }))
    await userEvent.type(screen.getByLabelText(/^nome$/i), 'Corte de cabelo')
    await userEvent.type(screen.getByLabelText(/duração mínima/i), '60')
    await userEvent.type(screen.getByLabelText(/^duração \(min\)$/i), '30')
    await userEvent.type(screen.getByLabelText(/duração máxima/i), '90')
    await userEvent.type(screen.getByLabelText(/preço/i), '80')
    await userEvent.type(screen.getByLabelText(/desconto máximo/i), '5')
    await userEvent.click(screen.getByRole('button', { name: /criar serviço/i }))

    expect(
      await screen.findByText(
        /a duração mínima não pode ser maior que a duração padrão/i,
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(createServiceSpy).not.toHaveBeenCalled()
  })

  it('clears the duration validation error as soon as the values become valid again', async () => {
    const createServiceSpy = vi.fn(() => Promise.resolve(massagemService))
    renderServicesPage(buildContainer({ createService: { execute: createServiceSpy } }))
    await screen.findByText('Massagem relaxante')

    await userEvent.click(screen.getByRole('button', { name: /novo serviço/i }))
    const minField = screen.getByLabelText(/duração mínima/i)
    const durationField = screen.getByLabelText(/^duração \(min\)$/i)
    const maxField = screen.getByLabelText(/duração máxima/i)
    await userEvent.type(screen.getByLabelText(/^nome$/i), 'Corte de cabelo')
    await userEvent.type(minField, '60')
    await userEvent.type(durationField, '30')
    await userEvent.type(maxField, '15')
    await userEvent.type(screen.getByLabelText(/preço/i), '80')
    await userEvent.type(screen.getByLabelText(/desconto máximo/i), '5')
    const submitButton = screen.getByRole('button', { name: /criar serviço/i })
    // A submit attempt always runs full validation regardless of mode, and
    // (once attempted) marks every field for onChange revalidation from then
    // on - the reliable way to first surface the cross-field error here.
    await userEvent.click(submitButton)

    expect(
      await screen.findByText(
        /a duração mínima não pode ser maior que a duração padrão/i,
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(createServiceSpy).not.toHaveBeenCalled()

    await userEvent.clear(minField)
    await userEvent.type(minField, '15')
    await userEvent.clear(durationField)
    await userEvent.type(durationField, '30')
    await userEvent.clear(maxField)
    await userEvent.type(maxField, '60')

    await vi.waitFor(
      () => {
        expect(
          screen.queryByText(/a duração mínima não pode ser maior que a duração padrão/i),
        ).not.toBeInTheDocument()
      },
      { timeout: 3000 },
    )
    await vi.waitFor(() => {
      expect(submitButton).toBeEnabled()
    })

    await userEvent.click(submitButton)
    await vi.waitFor(() => {
      expect(createServiceSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('toggles a tag on and includes it when creating a service', async () => {
    const createServiceSpy = vi.fn(() => Promise.resolve(massagemService))
    renderServicesPage(buildContainer({ createService: { execute: createServiceSpy } }))
    await screen.findByText('Massagem relaxante')

    await userEvent.click(screen.getByRole('button', { name: /novo serviço/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(screen.getByLabelText(/^nome$/i), 'Corte de cabelo')
    await userEvent.type(screen.getByLabelText(/duração mínima/i), '15')
    await userEvent.type(screen.getByLabelText(/^duração \(min\)$/i), '30')
    await userEvent.type(screen.getByLabelText(/duração máxima/i), '45')
    await userEvent.type(screen.getByLabelText(/preço/i), '80')
    await userEvent.type(screen.getByLabelText(/desconto máximo/i), '5')

    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Etiquetas' }))
    await userEvent.click(screen.getByRole('option', { name: /vip/i }))

    const submitButton = screen.getByRole('button', { name: /criar serviço/i })
    await vi.waitFor(() => {
      expect(submitButton).toBeEnabled()
    })
    await userEvent.click(submitButton)

    expect(createServiceSpy).toHaveBeenCalledExactlyOnceWith(
      tenantContext,
      expect.objectContaining({ tagIds: ['tag-1'] }),
    )
  })

  describe('inline category and tag creation', () => {
    it('creates a category from the service dialog, selects it, and keeps the dialog open', async () => {
      const newCategory = Category.create({ id: 'category-2', name: 'Cabelo' })
      // Mirrors a real backend: once created, the next list call includes it.
      const knownCategories = [massagensCategory]
      const listCategoriesSpy = vi.fn(() => Promise.resolve([...knownCategories]))
      const createCategorySpy = vi.fn(() => {
        knownCategories.push(newCategory)
        return Promise.resolve(newCategory)
      })
      renderServicesPage(
        buildContainer({
          createCategory: { execute: createCategorySpy },
          listCategories: { execute: listCategoriesSpy },
        }),
      )
      await screen.findByText('Massagem relaxante')

      await userEvent.click(screen.getByRole('button', { name: /novo serviço/i }))
      const dialog = screen.getByRole('dialog')
      await userEvent.click(within(dialog).getByRole('combobox', { name: 'Categoria' }))
      await userEvent.click(screen.getByRole('button', { name: /nova categoria/i }))
      const categoryPopover = getPopoverContent('Nova categoria')
      await userEvent.type(
        within(categoryPopover).getByRole('textbox', { name: /^nome$/i }),
        'Cabelo',
      )
      await userEvent.click(
        within(categoryPopover).getByRole('button', { name: /criar categoria/i }),
      )

      expect(createCategorySpy).toHaveBeenCalledExactlyOnceWith(tenantContext, { name: 'Cabelo' })
      await vi.waitFor(() => {
        expect(within(dialog).getByRole('combobox', { name: 'Categoria' })).toHaveTextContent(
          'Cabelo',
        )
      })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('creates a tag from the service dialog, toggles it on, and keeps the dialog open', async () => {
      const newTag = Tag.create({ id: 'tag-2', name: 'Promoção', color: '#0ea5e9' })
      // Mirrors a real backend: once created, the next list call includes it.
      const knownTags = [vipTag]
      const listTagsSpy = vi.fn(() => Promise.resolve([...knownTags]))
      const createTagSpy = vi.fn(() => {
        knownTags.push(newTag)
        return Promise.resolve(newTag)
      })
      renderServicesPage(
        buildContainer({
          createTag: { execute: createTagSpy },
          listTags: { execute: listTagsSpy },
        }),
      )
      await screen.findByText('Massagem relaxante')

      await userEvent.click(screen.getByRole('button', { name: /novo serviço/i }))
      const dialog = screen.getByRole('dialog')
      await userEvent.click(within(dialog).getByRole('combobox', { name: 'Etiquetas' }))
      await userEvent.click(screen.getByRole('button', { name: /nova etiqueta/i }))
      const tagPopover = getPopoverContent('Nova etiqueta')
      await userEvent.type(within(tagPopover).getByRole('textbox', { name: /^nome$/i }), 'Promoção')
      await userEvent.click(within(tagPopover).getByRole('button', { name: /criar etiqueta/i }))

      expect(createTagSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, {
        name: 'Promoção',
        color: TAG_COLOR_PALETTE[0],
      })
      await vi.waitFor(() => {
        expect(within(dialog).getByText('Promoção')).toBeInTheDocument()
      })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('delete', () => {
    it('shows a confirmation dialog naming the service before deleting', async () => {
      renderServicesPage(buildContainer())
      await screen.findByText('Massagem relaxante')

      await userEvent.click(screen.getByRole('button', { name: /excluir/i }))

      const alertDialog = await screen.findByRole('alertdialog')
      expect(within(alertDialog).getByText(/excluir serviço/i)).toBeInTheDocument()
      expect(within(alertDialog).getByText(/"Massagem relaxante"/)).toBeInTheDocument()
    })

    it('deletes the service when the confirmation is accepted', async () => {
      const deleteServiceSpy = vi.fn(() => Promise.resolve())
      renderServicesPage(buildContainer({ deleteService: { execute: deleteServiceSpy } }))
      await screen.findByText('Massagem relaxante')

      await userEvent.click(screen.getByRole('button', { name: /excluir/i }))
      const alertDialog = await screen.findByRole('alertdialog')
      await userEvent.click(within(alertDialog).getByRole('button', { name: 'Excluir' }))

      expect(deleteServiceSpy).toHaveBeenCalledExactlyOnceWith(tenantContext, 'service-1')
      await vi.waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('pagination', () => {
    it('shows the current page and total pages, disabling "Anterior" on the first page', async () => {
      renderServicesPage(
        buildContainer({
          listServices: {
            execute: vi.fn(() =>
              Promise.resolve({
                services: [massagemService],
                totalCount: 45,
                page: 1,
                pageSize: 20,
              }),
            ),
          },
        }),
      )
      await screen.findByText('Massagem relaxante')

      expect(screen.getByText('Página 1 de 3')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Próxima' })).toBeEnabled()
    })

    it('requests the next page when "Próxima" is clicked', async () => {
      const listServicesSpy = vi.fn(() =>
        Promise.resolve({ services: [massagemService], totalCount: 45, page: 1, pageSize: 20 }),
      )
      renderServicesPage(buildContainer({ listServices: { execute: listServicesSpy } }))
      await screen.findByText('Massagem relaxante')

      await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))

      await vi.waitFor(() => {
        expect(listServicesSpy).toHaveBeenCalledWith(tenantContext, {
          page: 2,
          pageSize: 20,
          search: '',
          categoryId: undefined,
          tagId: undefined,
        })
      })
    })

    it('disables "Próxima" on the last page', async () => {
      renderServicesPage(
        buildContainer({
          listServices: {
            execute: vi.fn(() =>
              Promise.resolve({
                services: [massagemService],
                totalCount: 20,
                page: 1,
                pageSize: 20,
              }),
            ),
          },
        }),
      )
      await screen.findByText('Massagem relaxante')

      expect(screen.getByText('Página 1 de 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
    })
  })

  describe('search and filters', () => {
    it('refetches with the debounced search term after the user stops typing', async () => {
      const listServicesSpy = vi.fn(() =>
        Promise.resolve({ services: [massagemService], totalCount: 1, page: 1, pageSize: 20 }),
      )
      renderServicesPage(buildContainer({ listServices: { execute: listServicesSpy } }))
      await screen.findByText('Massagem relaxante')
      listServicesSpy.mockClear()

      vi.useFakeTimers()
      try {
        fireEvent.change(screen.getByLabelText('Buscar serviço por nome'), {
          target: { value: 'massa' },
        })
        expect(listServicesSpy).not.toHaveBeenCalled()

        await act(async () => {
          await vi.advanceTimersByTimeAsync(300)
        })

        expect(listServicesSpy).toHaveBeenCalledWith(tenantContext, {
          page: 1,
          pageSize: 20,
          search: 'massa',
          categoryId: undefined,
          tagId: undefined,
        })
      } finally {
        vi.useRealTimers()
      }
    })

    it('refetches filtered by categoryId when a category is selected', async () => {
      const listServicesSpy = vi.fn(() =>
        Promise.resolve({ services: [massagemService], totalCount: 1, page: 1, pageSize: 20 }),
      )
      renderServicesPage(buildContainer({ listServices: { execute: listServicesSpy } }))
      await screen.findByText('Massagem relaxante')
      listServicesSpy.mockClear()

      await userEvent.click(screen.getByRole('combobox', { name: 'Filtrar por categoria' }))
      await userEvent.click(screen.getByRole('option', { name: 'Massagens' }))

      await vi.waitFor(() => {
        expect(listServicesSpy).toHaveBeenCalledWith(tenantContext, {
          page: 1,
          pageSize: 20,
          search: '',
          categoryId: 'category-1',
          tagId: undefined,
        })
      })
    })

    it('refetches filtered by tagId when a tag is selected', async () => {
      const listServicesSpy = vi.fn(() =>
        Promise.resolve({ services: [massagemService], totalCount: 1, page: 1, pageSize: 20 }),
      )
      renderServicesPage(buildContainer({ listServices: { execute: listServicesSpy } }))
      await screen.findByText('Massagem relaxante')
      listServicesSpy.mockClear()

      await userEvent.click(screen.getByRole('combobox', { name: 'Filtrar por etiqueta' }))
      await userEvent.click(screen.getByRole('option', { name: 'VIP' }))

      await vi.waitFor(() => {
        expect(listServicesSpy).toHaveBeenCalledWith(tenantContext, {
          page: 1,
          pageSize: 20,
          search: '',
          categoryId: undefined,
          tagId: 'tag-1',
        })
      })
    })
  })

  describe('security', () => {
    it.each(MALICIOUS_PAYLOADS)('renders "%s" as inert text, not markup', async payload => {
      const maliciousService = Service.create({
        id: 'malicious-1',
        code: 1002,
        name: payload,
        durationMinutes: 30,
        minDurationMinutes: 15,
        maxDurationMinutes: 60,
        price: 10,
        maxDiscountPercentage: 0,
        tags: [],
      })
      renderServicesPage(
        buildContainer({
          listServices: {
            execute: vi.fn(() =>
              Promise.resolve({
                services: [maliciousService],
                totalCount: 1,
                page: 1,
                pageSize: 20,
              }),
            ),
          },
        }),
      )

      expect(await screen.findByText(payload)).toBeInTheDocument()
      expect(document.querySelector('script')).not.toBeInTheDocument()
      expect(document.querySelector('img[onerror]')).not.toBeInTheDocument()
    })
  })
})
