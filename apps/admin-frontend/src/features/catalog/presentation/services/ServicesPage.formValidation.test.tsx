import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppError } from '@/shared/application/AppError'
import {
  buildContainer,
  renderServicesPage,
} from '@/features/catalog/presentation/services/ServicesPage.testSupport'

describe('ServicesPage', () => {
  describe('structured server errors', () => {
    async function fillValidServiceForm(): Promise<void> {
      await userEvent.click(screen.getByRole('button', { name: /novo serviço/i }))
      await userEvent.type(screen.getByLabelText(/^nome$/i), 'Corte de cabelo')
      await userEvent.type(screen.getByLabelText(/duração mínima/i), '15')
      await userEvent.type(screen.getByLabelText(/^duração \(min\)$/i), '30')
      await userEvent.type(screen.getByLabelText(/duração máxima/i), '45')
      await userEvent.type(screen.getByLabelText(/preço/i), '80')
      await userEvent.type(screen.getByLabelText(/desconto máximo/i), '5')
      const submitButton = screen.getByRole('button', { name: /criar serviço/i })
      await vi.waitFor(() => {
        expect(submitButton).toBeEnabled()
      })
      await userEvent.click(submitButton)
    }

    it('maps a validation field error from the API onto the Nome field and focuses it', async () => {
      const validationError = new AppError({
        code: 'validation',
        message: 'Ocorreram erros de validação.',
        retryable: false,
        rawFieldErrors: { Name: 'O nome é obrigatório.' },
      })
      renderServicesPage(
        buildContainer({
          createService: { execute: vi.fn(() => Promise.reject(validationError)) },
        }),
      )
      await screen.findByText('Massagem relaxante')

      await fillValidServiceForm()

      const fieldError = await screen.findByText('O nome é obrigatório.')
      expect(fieldError).toHaveAttribute('role', 'alert')
      expect(screen.getByLabelText(/^nome$/i)).toHaveFocus()
    })

    it('maps a duplicate-name conflict code from the API onto the Nome field', async () => {
      const conflictError = new AppError({
        code: 'conflict',
        message: 'Já existe um serviço com esse nome.',
        retryable: false,
        backendCode: 'Service.DuplicateName',
      })
      renderServicesPage(
        buildContainer({ createService: { execute: vi.fn(() => Promise.reject(conflictError)) } }),
      )
      await screen.findByText('Massagem relaxante')

      await fillValidServiceForm()

      const fieldError = await screen.findByText('Já existe um serviço com esse nome.')
      expect(fieldError).toHaveAttribute('role', 'alert')
      expect(screen.getByLabelText(/^nome$/i)).toHaveFocus()
    })

    it('maps a validation field error from the API onto the Categoria field and focuses its trigger', async () => {
      const validationError = new AppError({
        code: 'validation',
        message: 'Ocorreram erros de validação.',
        retryable: false,
        rawFieldErrors: { CategoryId: 'Categoria inválida.' },
      })
      renderServicesPage(
        buildContainer({
          createService: { execute: vi.fn(() => Promise.reject(validationError)) },
        }),
      )
      await screen.findByText('Massagem relaxante')

      await fillValidServiceForm()

      const fieldError = await screen.findByText('Categoria inválida.')
      expect(fieldError).toHaveAttribute('role', 'alert')
      // The categoryId field is wired through Controller/CreatableSingleSelect,
      // which has no DOM node of its own unless the trigger forwards a ref -
      // this proves setFocus('categoryId') actually lands somewhere focusable.
      expect(screen.getByRole('combobox', { name: 'Categoria' })).toHaveFocus()
    })
  })

  describe('client-side validation focus', () => {
    it('focuses Nome and flags every empty required field after submitting an empty form', async () => {
      renderServicesPage(buildContainer())
      await screen.findByText('Massagem relaxante')

      await userEvent.click(screen.getByRole('button', { name: /novo serviço/i }))
      await userEvent.click(screen.getByRole('button', { name: /criar serviço/i }))

      const nameField = screen.getByLabelText(/^nome$/i)
      await screen.findByText(/informe o nome do serviço/i)
      expect(nameField).toHaveFocus()
      expect(nameField).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByLabelText(/duração mínima/i)).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByLabelText(/^duração \(min\)$/i)).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByLabelText(/duração máxima/i)).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByLabelText(/preço/i)).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByLabelText(/desconto máximo/i)).toHaveAttribute('aria-invalid', 'true')
    })
  })
})
