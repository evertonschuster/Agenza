import { vi } from 'vitest'
import type { SessionEventBus } from '@/shared/application/SessionEventBus'

// Fully-functional, not a stub: subscribers are actually notified. Lets
// presentation-layer tests avoid importing infrastructure/ (docs/adr/007).
export function createFakeSessionEventBus(): SessionEventBus {
  const listeners = new Set<() => void>()

  return {
    notifyUnauthenticated: vi.fn(() => {
      for (const listener of listeners) {
        listener()
      }
    }),
    subscribe: vi.fn((listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }),
  }
}
