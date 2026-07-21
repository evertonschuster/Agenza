import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type JSX } from 'react'
import { TextAreaField } from './TextAreaField'

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
})
