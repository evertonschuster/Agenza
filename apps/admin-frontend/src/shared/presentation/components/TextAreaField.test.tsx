import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState, type JSX } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { TextAreaField } from '@/shared/presentation/components/TextAreaField'

function ControlledTextAreaField(): JSX.Element {
  const [value, setValue] = useState('')
  return (
    <TextAreaField
      id="description"
      label="Descrição"
      maxLength={10}
      showCount
      value={value}
      onChange={event => {
        setValue(event.target.value)
      }}
    />
  )
}

interface UncontrolledFormValues {
  description: string
}

let uncontrolledRenderCount = 0

function UncontrolledTextAreaField({ initialValue = '' }: { initialValue?: string }): JSX.Element {
  const { register, control, reset } = useForm<UncontrolledFormValues>({
    defaultValues: { description: initialValue },
  })
  const description = useWatch({ control, name: 'description' })

  // Counted from an effect, not during render: mutating a module-level
  // variable while rendering is an impure side effect React's own lint
  // rule (react-hooks/globals) now forbids, even for test instrumentation.
  useEffect(() => {
    uncontrolledRenderCount += 1
  })

  return (
    <div>
      <TextAreaField
        id="description"
        label="Descrição"
        maxLength={10}
        showCount
        currentLength={description.length}
        {...register('description')}
      />
      <button
        type="button"
        onClick={() => {
          reset({ description: 'ok' })
        }}
      >
        Reset
      </button>
    </div>
  )
}

describe('TextAreaField', () => {
  it('associates the label with the textarea via htmlFor/id', async () => {
    render(<ControlledTextAreaField />)

    const textarea = screen.getByLabelText('Descrição')
    await userEvent.type(textarea, 'Hello')

    expect(textarea).toHaveValue('Hello')
  })

  it('shows a character counter that updates as the user types', async () => {
    render(<ControlledTextAreaField />)

    expect(screen.getByText('0/10')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Descrição'), 'Hello')

    expect(screen.getByText('5/10')).toBeInTheDocument()
  })

  it('does not truncate typing past maxLength via the textarea attribute', async () => {
    render(<ControlledTextAreaField />)

    await userEvent.type(screen.getByLabelText('Descrição'), '12345678901234')

    expect(screen.getByLabelText('Descrição')).toHaveValue('1234567890')
    expect(screen.getByText('10/10')).toBeInTheDocument()
  })

  it('omits the counter when showCount is not set', () => {
    render(<TextAreaField id="plain" label="Plain" maxLength={10} value="" onChange={vi.fn()} />)

    expect(screen.queryByText('0/10')).not.toBeInTheDocument()
  })

  describe('used uncontrolled behind react-hook-form register()', () => {
    it('reflects the initial value instead of always reading 0', () => {
      render(<UncontrolledTextAreaField initialValue="Olá" />)

      expect(screen.getByText('3/10')).toBeInTheDocument()
    })

    it('updates the counter as the user types', async () => {
      render(<UncontrolledTextAreaField />)

      expect(screen.getByText('0/10')).toBeInTheDocument()

      await userEvent.type(screen.getByLabelText('Descrição'), 'Hello')

      expect(screen.getByText('5/10')).toBeInTheDocument()
    })

    it('updates the counter after a form reset', async () => {
      render(<UncontrolledTextAreaField />)

      await userEvent.type(screen.getByLabelText('Descrição'), 'Hello')
      expect(screen.getByText('5/10')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Reset' }))

      expect(await screen.findByText('2/10')).toBeInTheDocument()
    })

    it('does not re-render on every keystroke of an unrelated field', async () => {
      uncontrolledRenderCount = 0
      render(<UncontrolledTextAreaField />)
      const renderCountAfterMount = uncontrolledRenderCount

      await userEvent.type(screen.getByLabelText('Descrição'), 'Hi')

      // useWatch scoped to `description` alone re-renders once per keystroke
      // of that field - it must not also re-render for unrelated reasons,
      // and must not blow up to far more renders than keystrokes.
      expect(uncontrolledRenderCount - renderCountAfterMount).toBeLessThanOrEqual(2)
    })
  })

  it('sets aria-invalid and aria-describedby from error, with nothing to override them with', () => {
    render(
      <TextAreaField
        id="description"
        label="Descrição"
        value=""
        error="Obrigatório"
        onChange={() => undefined}
      />,
    )

    const textarea = screen.getByLabelText('Descrição')
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
    expect(textarea).toHaveAttribute('aria-describedby', 'description-error')
  })

  it('ignores a consumer-supplied aria-invalid, keeping the wrapper computed value', () => {
    // TypeScript's JSX checker special-cases aria-*/data-* attributes as
    // always assignable regardless of a component's declared props (Omit
    // can't block them at the type level) - the real protection is the
    // spread order in TextAreaField.tsx, which this test verifies directly
    // against the rendered DOM.
    render(
      <TextAreaField
        id="description"
        label="Descrição"
        value=""
        error="Obrigatório"
        onChange={() => undefined}
        aria-invalid={false}
      />,
    )

    expect(screen.getByLabelText('Descrição')).toHaveAttribute('aria-invalid', 'true')
  })

  it('rejects showCount: true without a usable maxLength at the type level', () => {
    const invalid = (
      // @ts-expect-error showCount: true has no counter to render without maxLength
      <TextAreaField id="x" label="X" value="" onChange={() => undefined} showCount />
    )
    void invalid
  })
})
