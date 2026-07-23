import { vi } from 'vitest'
import type { SessionEventBus } from '@/shared/application/SessionEventBus'

/**
 * A hand-written, fully-functional SessionEventBus fake - tests that don't
 * care about invalidation just never call notifyUnauthenticated(), while
 * tests that do (e.g. AuthProvider's) can rely on subscribers actually
 * being notified. Presentation-layer tests use this instead of the real
 * InMemorySessionEventBus so they never need to import infrastructure/
 * directly (docs/adr/007).
 */
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
