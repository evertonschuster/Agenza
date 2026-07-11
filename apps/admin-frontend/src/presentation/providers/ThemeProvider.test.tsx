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
})
