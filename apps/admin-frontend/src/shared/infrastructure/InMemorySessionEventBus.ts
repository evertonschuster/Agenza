import type { SessionEventBus } from '@/shared/application/SessionEventBus'

/**
 * The one instance of this class lives in the composition root for the
 * lifetime of the app - AuthenticatedHttpClient publishes to it, AuthProvider
 * subscribes to it. Deliberately framework-agnostic (no React) so it can be
 * constructed and passed to infrastructure before any provider exists.
 */
export class InMemorySessionEventBus implements SessionEventBus {
  private readonly listeners = new Set<() => void>()

  notifyUnauthenticated(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}
