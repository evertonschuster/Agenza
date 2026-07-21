import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { CreatableMultiSelect } from './CreatableMultiSelect'

interface Item {
  id: string
  name: string
  color: string
}

const items: Item[] = [
  { id: '1', name: 'VIP', color: '#0d9488' },
  { id: '2', name: 'Novo cliente', color: '#ef4444' },
]

function Harness({
  status = 'success',
  error = null,
  onRetry,
}: {
  status?: 'loading' | 'error' | 'success'
  error?: string | null
  onRetry?: () => void
}) {
  const [values, setValues] = useState<string[]>([])
  return (
    <CreatableMultiSelect
      label="Etiquetas"
      items={items}
      values={values}
      getKey={item => item.id}
      getLabel={item => item.name}
      getColor={item => item.color}
      onChange={setValues}
      placeholder="Selecionar etiquetas"
      searchPlaceholder="Buscar etiqueta…"
      emptyText="Nenhuma etiqueta encontrada."
      createActionLabel="Nova etiqueta"
      status={status}
      error={error}
      onRetry={onRetry}
      renderCreateForm={({ onCreated }) => (
        <button
          type="button"
          onClick={() => {
            onCreated({ id: '3', name: 'Promoção', color: '#0ea5e9' })
          }}
        >
          Simular criação
        </button>
      )}
    />
  )
}

describe('CreatableMultiSelect', () => {
  it('toggles multiple items on without closing the popover', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Etiquetas' }))
    await userEvent.click(screen.getByRole('option', { name: /vip/i }))
    await userEvent.click(screen.getByRole('option', { name: /novo cliente/i }))

    expect(screen.getByRole('combobox', { name: 'Etiquetas' })).toHaveTextContent(
      '2 selecionada(s)',
    )
    // Both selections are reflected as chips - no duplicate entries.
    expect(screen.getAllByText('VIP')).toHaveLength(2) // one in the (still open) list, one chip
  })

  it('removes a selected item via its chip', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Etiquetas' }))
    await userEvent.click(screen.getByRole('option', { name: /vip/i }))
    await userEvent.keyboard('{Escape}')

    await userEvent.click(screen.getByRole('button', { name: /remover vip/i }))

    expect(screen.getByText('Nenhuma selecionada.')).toBeInTheDocument()
  })

  it('exposes aria-expanded/aria-controls on the trigger', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('combobox', { name: 'Etiquetas' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls')

    await userEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('toggles the active option on with ArrowDown/Enter, without closing', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Etiquetas' }))
    // The first item is already the active one on open (cmdk's default),
    // so ArrowDown moves to the second - "Novo cliente".
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: /novo cliente/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await userEvent.keyboard('{Enter}')

    expect(screen.getByRole('combobox', { name: 'Etiquetas' })).toHaveTextContent(
      '1 selecionada(s)',
    )
    // Still open - Enter toggles, it doesn't close a multi-select.
    expect(screen.getByRole('option', { name: /novo cliente/i })).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Etiquetas' }))
    expect(screen.getByRole('option', { name: /vip/i })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('option', { name: /vip/i })).not.toBeInTheDocument()
  })

  it('filters the list by the search term', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Etiquetas' }))
    await userEvent.type(screen.getByPlaceholderText('Buscar etiqueta…'), 'novo')

    expect(screen.getByRole('option', { name: /novo cliente/i })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /^vip$/i })).not.toBeInTheDocument()
  })

  it('shows a loading state instead of the list', async () => {
    render(<Harness status="loading" />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Etiquetas' }))

    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('shows an error state with a retry action', async () => {
    const onRetry = vi.fn()
    render(<Harness status="error" error="network down" onRetry={onRetry} />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Etiquetas' }))
    expect(screen.getByText('network down')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /tentar novamente/i }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('switches to the create form, creates an item, and selects it as a chip', async () => {
    // Mirrors real usage: the parent's item list gains the new entry (via a
    // refetch) at the same time selection happens.
    function HarnessWithGrowingList() {
      const [values, setValues] = useState<string[]>([])
      const [allItems, setAllItems] = useState(items)
      return (
        <CreatableMultiSelect
          label="Etiquetas"
          items={allItems}
          values={values}
          getKey={item => item.id}
          getLabel={item => item.name}
          getColor={item => item.color}
          onChange={setValues}
          placeholder="Selecionar etiquetas"
          searchPlaceholder="Buscar etiqueta…"
          emptyText="Nenhuma etiqueta encontrada."
          createActionLabel="Nova etiqueta"
          status="success"
          error={null}
          renderCreateForm={({ onCreated }) => (
            <button
              type="button"
              onClick={() => {
                const created = { id: '3', name: 'Promoção', color: '#0ea5e9' }
                setAllItems(current => [...current, created])
                onCreated(created)
              }}
            >
              Simular criação
            </button>
          )}
        />
      )
    }
    render(<HarnessWithGrowingList />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Etiquetas' }))
    await userEvent.click(screen.getByRole('button', { name: /nova etiqueta/i }))
    await userEvent.click(screen.getByRole('button', { name: /simular criação/i }))

    expect(screen.getByText('Promoção')).toBeInTheDocument()
  })
})
