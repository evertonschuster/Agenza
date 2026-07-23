import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { TagForm, type TagFormValues, type TagFormField } from './TagForm'
import { TAG_COLOR_PALETTE } from '../../domain/entities/Tag'
import type { ServerFormError } from './serverFormError'

const EMPTY_VALUES: TagFormValues = { name: '', color: TAG_COLOR_PALETTE[0], description: '' }

interface RenderOverrides {
  initialValues?: TagFormValues
  serverError?: ServerFormError<TagFormField> | null
  isSubmitting?: boolean
}

function renderForm(overrides: RenderOverrides = {}): {
  onSubmit: ReturnType<typeof vi.fn>
  onCancel: ReturnType<typeof vi.fn>
  container: HTMLElement
} {
  const onSubmit = vi.fn(() => Promise.resolve())
  const onCancel = vi.fn()
  const { container } = render(
    <TagForm
      initialValues={overrides.initialValues ?? EMPTY_VALUES}
      submitLabel="Criar etiqueta"
      isSubmitting={overrides.isSubmitting ?? false}
      serverError={overrides.serverError ?? null}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />,
  )
  return { onSubmit, onCancel, container }
}

describe('TagForm color picker accessibility', () => {
  it('groups the color options under a fieldset/legend named "Cor"', () => {
    renderForm()

    expect(screen.getByRole('group', { name: 'Cor' })).toBeInTheDocument()
  })

  it('renders a labeled radio for every palette color', () => {
    renderForm()

    for (const color of TAG_COLOR_PALETTE) {
      expect(screen.getByRole('radio', { name: `Cor ${color}` })).toBeInTheDocument()
    }
  })

  it('marks the initial value as checked', () => {
    renderForm()

    expect(screen.getByRole('radio', { name: `Cor ${TAG_COLOR_PALETTE[0]}` })).toBeChecked()
    expect(screen.getByRole('radio', { name: `Cor ${TAG_COLOR_PALETTE[1]}` })).not.toBeChecked()
  })

  it('lets the user pick a different color via the keyboard (focus + activate)', async () => {
    renderForm()

    const target = screen.getByRole('radio', { name: `Cor ${TAG_COLOR_PALETTE[2]}` })
    target.focus()
    await userEvent.keyboard(' ')

    expect(target).toBeChecked()
    expect(screen.getByRole('radio', { name: `Cor ${TAG_COLOR_PALETTE[0]}` })).not.toBeChecked()
  })

  it('is reachable by Tab in document order alongside the other fields', async () => {
    renderForm()

    await userEvent.tab() // Nome
    await userEvent.tab() // first color radio
    expect(screen.getByRole('radio', { name: `Cor ${TAG_COLOR_PALETTE[0]}` })).toHaveFocus()
  })

  it('renders an accessible, announced error when the color field is invalid', async () => {
    const serverError: ServerFormError<TagFormField> = {
      fieldErrors: { color: 'Cor inválida.' },
      firstField: 'color',
      globalMessage: null,
    }
    renderForm({ serverError })

    const errorMessage = await screen.findByText('Cor inválida.')
    expect(errorMessage).toHaveAttribute('role', 'alert')

    const radios = screen.getAllByRole('radio')
    for (const radio of radios) {
      expect(radio).toHaveAttribute('aria-invalid', 'true')
      expect(radio).toHaveAttribute('aria-describedby', errorMessage.id)
    }
  })

  it('focuses a color radio when a server error targets the color field', async () => {
    const serverError: ServerFormError<TagFormField> = {
      fieldErrors: { color: 'Cor inválida.' },
      firstField: 'color',
      globalMessage: null,
    }
    renderForm({ serverError })

    await screen.findByText('Cor inválida.')

    const radios = screen.getAllByRole('radio')
    expect(radios.some(radio => radio === document.activeElement)).toBe(true)
  })

  it('does not render an error for color when the form has no errors', () => {
    renderForm()

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toHaveAttribute('aria-invalid', 'true')
    }
  })

  it('has no axe violations in its default state', async () => {
    const { container } = renderForm()

    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations while showing the color validation error', async () => {
    const serverError: ServerFormError<TagFormField> = {
      fieldErrors: { color: 'Cor inválida.' },
      firstField: 'color',
      globalMessage: null,
    }
    const { container } = renderForm({ serverError })

    await screen.findByText('Cor inválida.')

    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('TagForm general behavior', () => {
  it('disables the submit button while the name field is invalid', async () => {
    renderForm()

    await userEvent.click(screen.getByLabelText('Nome'))
    await userEvent.tab()

    expect(await screen.findByText(/deve ter entre 1 e 40 caracteres/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar etiqueta' })).toBeDisabled()
  })

  it('submits the current values, including the selected color, when valid', async () => {
    const { onSubmit } = renderForm()

    await userEvent.type(screen.getByLabelText('Nome'), 'VIP')
    const target = screen.getByRole('radio', { name: `Cor ${TAG_COLOR_PALETTE[3]}` })
    await userEvent.click(target)
    await userEvent.click(screen.getByRole('button', { name: 'Criar etiqueta' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      name: 'VIP',
      color: TAG_COLOR_PALETTE[3],
      description: '',
    })
  })
})
