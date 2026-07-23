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
})
