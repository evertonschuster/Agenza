import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { Service } from '@/features/catalog/domain/entities/Service'
import { MALICIOUS_PAYLOADS } from '@/test/fixtures/maliciousPayloads'
import {
  tenantContext,
  buildContainer,
  renderServicesPage,
} from '@/features/catalog/presentation/services/ServicesPage.testSupport'

describe('ServicesPage', () => {
  describe('accessibility', () => {
    it('has no axe violations with the create-service dialog open', async () => {
      const container = renderServicesPage(buildContainer())
      await screen.findByText('Massagem relaxante')

      await userEvent.click(screen.getByRole('button', { name: /novo serviço/i }))
      await screen.findByRole('dialog')

      expect(await axe(container)).toHaveNoViolations()
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
