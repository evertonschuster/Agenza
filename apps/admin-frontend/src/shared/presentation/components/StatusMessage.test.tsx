import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusMessage } from '@/shared/presentation/components/StatusMessage'

describe('StatusMessage', () => {
  it('renders an error message with role="alert"', () => {
    render(<StatusMessage tone="error">Algo deu errado.</StatusMessage>)

    const message = screen.getByRole('alert')
    expect(message).toHaveTextContent('Algo deu errado.')
    expect(message).not.toHaveAttribute('aria-live')
  })

  it('renders a success message with aria-live="polite"', () => {
    render(<StatusMessage tone="success">Salvo com sucesso.</StatusMessage>)

    const message = screen.getByText('Salvo com sucesso.')
    expect(message).toHaveAttribute('aria-live', 'polite')
    expect(message).not.toHaveAttribute('role', 'alert')
  })

  it('renders a warning message with aria-live="polite"', () => {
    render(<StatusMessage tone="warning">Atenção.</StatusMessage>)

    expect(screen.getByText('Atenção.')).toHaveAttribute('aria-live', 'polite')
  })

  it('renders an info message with aria-live="polite"', () => {
    render(<StatusMessage tone="info">Só um aviso.</StatusMessage>)

    expect(screen.getByText('Só um aviso.')).toHaveAttribute('aria-live', 'polite')
  })

  it('renders a loading message with aria-live="polite"', () => {
    render(<StatusMessage tone="loading">Carregando…</StatusMessage>)

    expect(screen.getByText('Carregando…')).toHaveAttribute('aria-live', 'polite')
  })

  it('defaults to the muted tone with aria-live="polite"', () => {
    render(<StatusMessage>Uma mensagem qualquer.</StatusMessage>)

    const message = screen.getByText('Uma mensagem qualquer.')
    expect(message).toHaveAttribute('aria-live', 'polite')
    expect(message.className).toContain('text-muted-foreground')
  })

  it('associates with a field via id for aria-describedby', () => {
    render(<StatusMessage id="field-hint">Dica do campo.</StatusMessage>)

    expect(screen.getByText('Dica do campo.')).toHaveAttribute('id', 'field-hint')
  })
})
