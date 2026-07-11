import type { JSX, ReactNode } from 'react'

type StatusMessageTone = 'muted' | 'error'

interface StatusMessageProps {
  tone?: StatusMessageTone
  children: ReactNode
}

const TONE_CLASSES: Record<StatusMessageTone, string> = {
  muted: 'text-muted-foreground',
  error: 'text-destructive',
}

export function StatusMessage({ tone = 'muted', children }: StatusMessageProps): JSX.Element {
  return <p className={`text-sm ${TONE_CLASSES[tone]}`}>{children}</p>
}
