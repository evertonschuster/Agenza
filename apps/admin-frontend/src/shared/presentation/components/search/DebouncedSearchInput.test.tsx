import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DebouncedSearchInput } from '@/shared/presentation/components/search/DebouncedSearchInput'

describe('DebouncedSearchInput', () => {
  it('reflects typed value immediately in the input', async () => {
    render(
      <DebouncedSearchInput aria-label="Buscar" onDebouncedChange={() => undefined} />,
    )

    await userEvent.type(screen.getByLabelText('Buscar'), 'abc')

    expect(screen.getByLabelText('Buscar')).toHaveValue('abc')
  })

  it('calls onDebouncedChange after the delay', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    render(<DebouncedSearchInput aria-label="Buscar" delayMs={300} onDebouncedChange={onChange} />)
    onChange.mockClear()

    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'cat' } })
    expect(onChange).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(300) })
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith('cat')

    vi.useRealTimers()
  })

  it('does not call onDebouncedChange for intermediate keystrokes within the delay', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    render(<DebouncedSearchInput aria-label="Buscar" delayMs={300} onDebouncedChange={onChange} />)
    onChange.mockClear()

    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'a' } })
    act(() => { vi.advanceTimersByTime(100) })
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'ab' } })
    act(() => { vi.advanceTimersByTime(100) })
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'abc' } })

    expect(onChange).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(300) })
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith('abc')

    vi.useRealTimers()
  })

  it('passes extra Input props through', () => {
    render(
      <DebouncedSearchInput
        aria-label="Buscar"
        placeholder="Buscar por nome…"
        onDebouncedChange={() => undefined}
      />,
    )

    expect(screen.getByPlaceholderText('Buscar por nome…')).toBeInTheDocument()
  })
})
