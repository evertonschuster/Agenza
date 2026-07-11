import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { JSX } from 'react'
import { ThemeProvider } from './ThemeProvider'
import { useTheme } from '../hooks/useTheme'

function ThemeReadout(): JSX.Element {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <p>Current theme: {theme}</p>
      <button
        type="button"
        onClick={() => {
          setTheme('dark')
        }}
      >
        Go dark
      </button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    vi.unstubAllGlobals()
  })

  it('defaults to the OS preference when no theme has been chosen', () => {
    render(
      <ThemeProvider>
        <ThemeReadout />
      </ThemeProvider>,
    )

    expect(screen.getByText('Current theme: light')).toBeInTheDocument()
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('reads a previously persisted theme on mount', () => {
    localStorage.setItem('admin-theme', 'dark')

    render(
      <ThemeProvider>
        <ThemeReadout />
      </ThemeProvider>,
    )

    expect(screen.getByText('Current theme: dark')).toBeInTheDocument()
    expect(document.documentElement).toHaveClass('dark')
  })

  it('persists an explicit choice and applies the dark class', async () => {
    render(
      <ThemeProvider>
        <ThemeReadout />
      </ThemeProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Go dark' }))

    expect(screen.getByText('Current theme: dark')).toBeInTheDocument()
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('admin-theme')).toBe('dark')
  })

  it('does not let a later OS theme change override an explicit choice', async () => {
    const capturedHandlers: ((event: MediaQueryListEvent) => void)[] = []
    function captureHandler(_event: string, handler: (event: MediaQueryListEvent) => void): void {
      capturedHandlers.push(handler)
    }

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: captureHandler,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )

    render(
      <ThemeProvider>
        <ThemeReadout />
      </ThemeProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Go dark' }))
    expect(screen.getByText('Current theme: dark')).toBeInTheDocument()

    expect(capturedHandlers).toHaveLength(1)
    capturedHandlers[0]?.({ matches: false } as MediaQueryListEvent)

    expect(screen.getByText('Current theme: dark')).toBeInTheDocument()
  })
})
