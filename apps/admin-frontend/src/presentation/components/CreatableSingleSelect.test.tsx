import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type JSX } from 'react'
import { CreatableSingleSelect } from './CreatableSingleSelect'

interface Item {
  id: string
  name: string
}

const items: Item[] = [
  { id: '1', name: 'Massagens' },
  { id: '2', name: 'Estética' },
]

function Harness({
  status = 'success',
  error = null,
  onRetry,
}: {
  status?: 'loading' | 'error' | 'success'
  error?: string | null
  onRetry?: () => void
}): JSX.Element {
  const [value, setValue] = useState<string | null>(null)
  return (
    <CreatableSingleSelect
      label="Categoria"
      items={items}
      value={value}
      getKey={item => item.id}
      getLabel={item => item.name}
      onChange={setValue}
      nullLabel="Sem categoria"
      searchPlaceholder="Buscar categoria…"
      emptyText="Nenhuma categoria encontrada."
      createActionLabel="Nova categoria"
      status={status}
      error={error}
      onRetry={onRetry}
      renderCreateForm={({ onCreated }) => (
        <button
          type="button"
          onClick={() => {
            onCreated({ id: '3', name: 'Nova' })
          }}
        >
          Simular criação
        </button>
      )}
    />
  )
}

describe('CreatableSingleSelect', () => {
  it('opens and lists every item, selecting one on click', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Categoria' }))
    expect(screen.getByRole('option', { name: 'Massagens' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: 'Estética' }))

    expect(screen.getByRole('combobox', { name: 'Categoria' })).toHaveTextContent('Estética')
  })

  it('filters the list by the search term', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Categoria' }))
    await userEvent.type(screen.getByPlaceholderText('Buscar categoria…'), 'mas')

    expect(screen.getByRole('option', { name: 'Massagens' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Estética' })).not.toBeInTheDocument()
  })

  it('shows the empty text when the search matches nothing', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Categoria' }))
    await userEvent.type(screen.getByPlaceholderText('Buscar categoria…'), 'zzz')

    expect(screen.getByText('Nenhuma categoria encontrada.')).toBeInTheDocument()
  })

  it('selects the "no selection" option', async () => {
    function ControlledHarness(): JSX.Element {
      const [value, setValue] = useState<string | null>('1')
      return (
        <CreatableSingleSelect
          label="Categoria"
          items={items}
          value={value}
          getKey={item => item.id}
          getLabel={item => item.name}
          onChange={setValue}
          nullLabel="Sem categoria"
          searchPlaceholder="Buscar categoria…"
          emptyText="Nenhuma categoria encontrada."
          createActionLabel="Nova categoria"
          status="success"
          error={null}
          renderCreateForm={() => null}
        />
      )
    }
    render(<ControlledHarness />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Categoria' }))
    await userEvent.click(screen.getByRole('option', { name: 'Sem categoria' }))

    expect(screen.getByRole('combobox', { name: 'Categoria' })).toHaveTextContent('Sem categoria')
  })

  it('shows a loading state instead of the list', async () => {
    render(<Harness status="loading" />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Categoria' }))

    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('shows an error state with a retry action', async () => {
    const onRetry = vi.fn()
    render(<Harness status="error" error="network down" onRetry={onRetry} />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Categoria' }))
    expect(screen.getByText('network down')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /tentar novamente/i }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('exposes aria-expanded/aria-controls on the trigger and opens on click', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('combobox', { name: 'Categoria' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls')

    await userEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('navigates and selects options with ArrowDown/ArrowUp and Enter', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Categoria' }))
    const searchInput = screen.getByPlaceholderText('Buscar categoria…')

    // ArrowDown moves the active option forward through the list.
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: 'Estética' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    // ArrowUp moves it back.
    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('option', { name: 'Massagens' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    expect(searchInput).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Massagens' }).id,
    )

    await userEvent.keyboard('{Enter}')

    expect(screen.getByRole('combobox', { name: 'Categoria' })).toHaveTextContent('Massagens')
  })

  it('jumps to the first/last option with Home/End', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Categoria' }))

    await userEvent.keyboard('{End}')
    expect(screen.getByRole('option', { name: 'Estética' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('option', { name: 'Sem categoria' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('closes on Escape', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Categoria' }))
    expect(screen.getByRole('option', { name: 'Massagens' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('option', { name: 'Massagens' })).not.toBeInTheDocument()
  })

  it('switches to the create form, creates an item, and selects it', async () => {
    // Mirrors real usage: the parent's item list gains the new entry (via a
    // refetch) at the same time selection happens.
    function HarnessWithGrowingList(): JSX.Element {
      const [value, setValue] = useState<string | null>(null)
      const [allItems, setAllItems] = useState(items)
      return (
        <CreatableSingleSelect
          label="Categoria"
          items={allItems}
          value={value}
          getKey={item => item.id}
          getLabel={item => item.name}
          onChange={setValue}
          nullLabel="Sem categoria"
          searchPlaceholder="Buscar categoria…"
          emptyText="Nenhuma categoria encontrada."
          createActionLabel="Nova categoria"
          status="success"
          error={null}
          renderCreateForm={({ onCreated }) => (
            <button
              type="button"
              onClick={() => {
                const created = { id: '3', name: 'Nova' }
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

    await userEvent.click(screen.getByRole('combobox', { name: 'Categoria' }))
    await userEvent.click(screen.getByRole('button', { name: /nova categoria/i }))
    await userEvent.click(screen.getByRole('button', { name: /simular criação/i }))

    expect(screen.getByRole('combobox', { name: 'Categoria' })).toHaveTextContent('Nova')
  })
})
