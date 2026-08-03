import type { JSX, ReactNode } from 'react'

type StatusMessageTone = 'muted' | 'error' | 'success' | 'warning' | 'info' | 'loading'

interface StatusMessageProps {
  tone?: StatusMessageTone
  children: ReactNode
  /** Associates this message with a form field via aria-describedby. */
  id?: string
}

// `destructive` is the only non-neutral token this theme has - other tones
// differentiate via role/aria-live instead of inventing new colors.
const TONE_CLASSES: Record<StatusMessageTone, string> = {
  muted: 'text-muted-foreground',
  error: 'text-destructive',
  success: 'text-foreground',
  warning: 'text-foreground',
  info: 'text-muted-foreground',
  loading: 'text-muted-foreground',
}

export function StatusMessage({ tone = 'muted', children, id }: StatusMessageProps): JSX.Element {
  const isError = tone === 'error'

  return (
    <p
      id={id}
      className={`text-sm ${TONE_CLASSES[tone]}`}
      role={isError ? 'alert' : undefined}
      aria-live={isError ? undefined : 'polite'}
    >
      {children}
    </p>
  )
}
