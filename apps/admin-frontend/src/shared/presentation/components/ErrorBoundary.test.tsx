import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { JSX } from 'react'
import { ErrorBoundary } from '@/shared/presentation/components/ErrorBoundary'

// A plain mutable flag, not a counter that flips itself after N renders:
// React 19 retries a thrown render synchronously once before surfacing the
// error to the nearest boundary (recovering silently if that retry
// succeeds), so a component that only throws on its very first call never
// actually reaches the boundary - the retry itself "uses up" the one throw.
// Tests only flip `controllableBomb.shouldThrow` to false *after* already
// asserting the boundary caught the failure, so both the original attempt
// and React's internal retry consistently fail up front.
const controllableBomb = { shouldThrow: true }

function ControllableBomb(): JSX.Element {
  if (controllableBomb.shouldThrow) {
    throw new Error('boom')
  }
  return <div>recovered</div>
}

function ThrowsChunkLoadError(): JSX.Element {
  throw new Error('Failed to fetch dynamically imported module: /assets/Foo-abc.js')
}

describe('ErrorBoundary', () => {
  const originalLocation = window.location
  let reloadSpy: ReturnType<typeof vi.fn>
  let assignSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    controllableBomb.shouldThrow = true
    reloadSpy = vi.fn()
    assignSpy = vi.fn()
    // A plain stub, not a spread of the Location instance (which would lose
    // its prototype) - only reload/assign are ever read by the code under test.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadSpy, assign: assignSpy },
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    vi.restoreAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>safe content</div>
      </ErrorBoundary>,
    )

    expect(screen.getByText('safe content')).toBeInTheDocument()
  })

  it('shows a Portuguese error screen, without the raw error message, when a child throws', () => {
    render(
      <ErrorBoundary>
        <ControllableBomb />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument()
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument()
  })

  it('recovers via "Tentar novamente" once the underlying error condition is gone', async () => {
    render(
      <ErrorBoundary>
        <ControllableBomb />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument()

    controllableBomb.shouldThrow = false
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(screen.getByText('recovered')).toBeInTheDocument()
  })

  it('navigates to the dashboard when "Voltar ao início" is clicked', async () => {
    render(
      <ErrorBoundary>
        <ControllableBomb />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Voltar ao início' }))

    expect(assignSpy).toHaveBeenCalledExactlyOnceWith('/dashboard')
  })

  it('shows the chunk-reload screen for a stale-chunk error, with only a reload action', async () => {
    render(
      <ErrorBoundary>
        <ThrowsChunkLoadError />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Nova versão disponível')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Voltar ao início' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Atualizar página' }))

    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })
})
