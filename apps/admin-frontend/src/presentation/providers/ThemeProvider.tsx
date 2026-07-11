import { useEffect, useState, type JSX, type ReactNode } from 'react'
import { ThemeContext, type Theme } from './ThemeContext'

const STORAGE_KEY = 'admin-theme'

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : getSystemTheme()
}

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * Defaults to the OS color-scheme preference. Once the user picks a theme
 * explicitly (setTheme), that choice is persisted and the OS preference is
 * no longer followed - matches "start with OS theme, remember an override".
 */
export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== null) {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    function handleChange(event: MediaQueryListEvent): void {
      // Re-check here, not just at effect setup: this listener stays attached
      // for the component's lifetime, so an explicit setTheme() call after
      // mount must still stop a later OS change from overriding it.
      if (localStorage.getItem(STORAGE_KEY) !== null) {
        return
      }
      setThemeState(event.matches ? 'dark' : 'light')
    }

    media.addEventListener('change', handleChange)
    return () => {
      media.removeEventListener('change', handleChange)
    }
  }, [])

  function setTheme(next: Theme): void {
    localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
