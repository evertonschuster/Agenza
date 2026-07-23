import type { JSX } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/shared/presentation/hooks/useTheme'

export function ThemeToggle(): JSX.Element {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      onClick={() => {
        setTheme(isDark ? 'light' : 'dark')
      }}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}
