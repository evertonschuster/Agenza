import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type JSX } from 'react'
import { TextField } from '@/shared/presentation/components/TextField'

function ControlledTextField(): JSX.Element {
  const [value, setValue] = useState('')
  return (
    <TextField
      id="name"
      label="Name"
      value={value}
      onChange={event => {
        setValue(event.target.value)
      }}
    />
  )
}

describe('TextField', () => {
  it('associates the label with the input via htmlFor/id', async () => {
    render(<ControlledTextField />)

    const input = screen.getByLabelText('Name')
    await userEvent.type(input, 'VIP')

    expect(input).toHaveValue('VIP')
  })

  it('sets aria-invalid and aria-describedby from error, with nothing to override them with', () => {
    render(
      <TextField id="name" label="Name" value="" error="Obrigatório" onChange={() => undefined} />,
    )

    const input = screen.getByLabelText('Name')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'name-error')
  })

  it('clears aria-invalid/aria-describedby when there is no error', () => {
    render(<TextField id="name" label="Name" value="" onChange={() => undefined} />)

    const input = screen.getByLabelText('Name')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(input).not.toHaveAttribute('aria-describedby')
  })

  it('ignores a consumer-supplied aria-invalid/aria-describedby, keeping the wrapper computed values', () => {
    // TypeScript's JSX checker special-cases aria-*/data-* attributes as
    // always assignable regardless of a component's declared props (Omit
    // can't block them at the type level) - the real protection is the
    // spread order in TextField.tsx, which this test verifies directly
    // against the rendered DOM.
    render(
      <TextField
        id="name"
        label="Name"
        value=""
        error="Obrigatório"
        onChange={() => undefined}
        aria-invalid={false}
        aria-describedby="something-else"
      />,
    )

    const input = screen.getByLabelText('Name')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'name-error')
  })
})
