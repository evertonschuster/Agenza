import type { JSX, ReactNode } from 'react'

type StatusMessageTone = 'muted' | 'error' | 'success' | 'warning' | 'info' | 'loading'

interface StatusMessageProps {
  tone?: StatusMessageTone
  children: ReactNode
  /** Associates this message with a form field via aria-describedby. */
  id?: string
}

// This app's theme is the stock shadcn/ui Nova neutral palette, deliberately
// unmodified (no custom brand color) - `destructive` is the only non-neutral
// token available, so success/warning/info/loading differentiate through
// `role`/`aria-live` and text weight rather than inventing new colors.
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
