import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Category } from '@/features/catalog/domain/entities/Category'
import { Tag, TAG_COLOR_PALETTE } from '@/features/catalog/domain/entities/Tag'
import { AppError } from '@/shared/application/AppError'
import {
  tenantContext,
  massagemService,
  massagensCategory,
  vipTag,
  buildContainer,
  renderServicesPage,
  getPopoverContent,
} from '@/features/catalog/presentation/services/ServicesPage.testSupport'

describe('ServicesPage', () => {
  it('renders the service list once loaded', async () => {
    renderServicesPage(buildContainer())

    expect(await screen.findByText('Massagem relaxante')).toBeInTheDocument()
    expect(screen.getByText('1001')).toBeInTheDocument()
    expect(screen.getByText('Massagens')).toBeInTheDocument()
    expect(screen.getByText('60 min (30–90)')).toBeInTheDocument()
    expect(screen.getByText('VIP')).toBeInTheDocument()
  })

  it('pins the Ações column to the right edge so it stays reachable on narrow viewports', async () => {
    renderServicesPage(buildContainer())
    await screen.findByText('Massagem relaxante')

    const actionsHeader = screen.getByRole('columnheader', { name: 'Ações' })
    expect(actionsHeader.className).toMatch(/\bsticky\b/)
    expect(actionsHeader.className).toMatch(/\bright-0\b/)
    const editButton = screen.getByRole('button', { name: /editar/i })
    const actionsCell = editButton.closest('td')
    expect(actionsCell?.className).toMatch(/\bsticky\b/)
    expect(actionsCell?.className).toMatch(/\bright-0\b/)
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
        listServices: {
          execute: vi.fn(() =>
            Promise.reject(
              new AppError({ code: 'network', message: 'network down', retryable: true }),
            ),
          ),
        },
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
})
