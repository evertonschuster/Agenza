import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InlineCreatePopover } from './InlineCreatePopover'

describe('InlineCreatePopover', () => {
  it('reveals the popover content when the trigger is clicked', async () => {
    render(
      <InlineCreatePopover triggerLabel="Nova categoria" title="Nova categoria">
        {() => <p>Formulário embutido</p>}
      </InlineCreatePopover>,
    )

    expect(screen.queryByText('Formulário embutido')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /nova categoria/i }))

    expect(screen.getByText('Formulário embutido')).toBeInTheDocument()
  })

  it('lets the embedded content close the popover through the render-prop close callback', async () => {
    render(
      <InlineCreatePopover triggerLabel="Nova etiqueta" title="Nova etiqueta">
        {close => (
          <button type="button" onClick={close}>
            Fechar
          </button>
        )}
      </InlineCreatePopover>,
    )

    await userEvent.click(screen.getByRole('button', { name: /nova etiqueta/i }))
    expect(screen.getByRole('button', { name: /^fechar$/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^fechar$/i }))

    expect(screen.queryByRole('button', { name: /^fechar$/i })).not.toBeInTheDocument()
  })
})
