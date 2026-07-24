import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  tenantContext,
  massagemService,
  buildContainer,
  renderServicesPage,
} from '@/features/catalog/presentation/services/ServicesPage.testSupport'

describe('ServicesPage', () => {
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
})
