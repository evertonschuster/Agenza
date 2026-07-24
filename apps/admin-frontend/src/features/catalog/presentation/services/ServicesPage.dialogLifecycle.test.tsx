import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  buildContainer,
  renderServicesPage,
} from '@/features/catalog/presentation/services/ServicesPage.testSupport'

describe('ServicesPage', () => {
  describe('dialog close protection (unsaved changes)', () => {
    it('closes immediately on Escape when the form was never touched', async () => {
      renderServicesPage(buildContainer())
      await screen.findByText('Massagem relaxante')

      await userEvent.click(screen.getByRole('button', { name: /novo serviço/i }))
      await screen.findByRole('dialog')
      await userEvent.keyboard('{Escape}')

      await vi.waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      expect(screen.queryByText(/descartar alterações/i)).not.toBeInTheDocument()
    })

    it('asks for confirmation instead of closing when Escape is pressed with unsaved changes', async () => {
      renderServicesPage(buildContainer())
      await screen.findByText('Massagem relaxante')

      await userEvent.click(screen.getByRole('button', { name: /novo serviço/i }))
      await userEvent.type(screen.getByLabelText(/^nome$/i), 'Rascunho não salvo')
      await userEvent.keyboard('{Escape}')

      const confirm = await screen.findByRole('alertdialog')
      expect(within(confirm).getByText(/descartar alterações/i)).toBeInTheDocument()
      // The underlying form dialog stays mounted (values intact) even
      // though Radix marks it aria-hidden while the confirmation is the
      // topmost layer - queried with {hidden: true} for that reason.
      expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument()
    })

    it('preserves the typed values when the discard confirmation is cancelled', async () => {
      renderServicesPage(buildContainer())
      await screen.findByText('Massagem relaxante')

      await userEvent.click(screen.getByRole('button', { name: /novo serviço/i }))
      await userEvent.type(screen.getByLabelText(/^nome$/i), 'Rascunho não salvo')
      await userEvent.keyboard('{Escape}')
      const confirm = await screen.findByRole('alertdialog')
      await userEvent.click(within(confirm).getByRole('button', { name: /continuar editando/i }))

      await vi.waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
      expect(screen.getByLabelText(/^nome$/i)).toHaveValue('Rascunho não salvo')
    })

    it('discards the draft and closes the dialog when confirmed', async () => {
      renderServicesPage(buildContainer())
      await screen.findByText('Massagem relaxante')

      await userEvent.click(screen.getByRole('button', { name: /novo serviço/i }))
      await userEvent.type(screen.getByLabelText(/^nome$/i), 'Rascunho não salvo')
      await userEvent.keyboard('{Escape}')
      const confirm = await screen.findByRole('alertdialog')
      await userEvent.click(within(confirm).getByRole('button', { name: /^descartar$/i }))

      await vi.waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })

      await userEvent.click(screen.getByRole('button', { name: /novo serviço/i }))
      expect(screen.getByLabelText(/^nome$/i)).toHaveValue('')
    })

    it('also intercepts Cancel when the form has unsaved changes', async () => {
      renderServicesPage(buildContainer())
      await screen.findByText('Massagem relaxante')

      await userEvent.click(screen.getByRole('button', { name: /novo serviço/i }))
      await userEvent.type(screen.getByLabelText(/^nome$/i), 'Rascunho não salvo')
      await userEvent.click(screen.getByRole('button', { name: /^cancelar$/i }))

      const confirm = await screen.findByRole('alertdialog')
      expect(within(confirm).getByText(/descartar alterações/i)).toBeInTheDocument()
    })
  })

  describe('focus restoration on dialog close', () => {
    it('returns focus to "Novo serviço" after closing the create dialog with Escape', async () => {
      renderServicesPage(buildContainer())
      await screen.findByText('Massagem relaxante')

      const triggerButton = screen.getByRole('button', { name: /novo serviço/i })
      await userEvent.click(triggerButton)
      await screen.findByRole('dialog')
      await userEvent.keyboard('{Escape}')

      await vi.waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      expect(triggerButton).toHaveFocus()
    })

    it('returns focus to the row\'s "Editar" button after closing the edit dialog with Escape', async () => {
      renderServicesPage(buildContainer())
      await screen.findByText('Massagem relaxante')

      const editButton = screen.getByRole('button', { name: /editar/i })
      await userEvent.click(editButton)
      await screen.findByRole('dialog')
      await userEvent.keyboard('{Escape}')

      await vi.waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      expect(editButton).toHaveFocus()
    })
  })
})
