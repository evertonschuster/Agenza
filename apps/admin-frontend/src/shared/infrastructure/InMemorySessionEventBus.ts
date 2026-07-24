import type { SessionEventBus } from '@/shared/application/SessionEventBus'

// Framework-agnostic (no React) so it can be constructed before any provider exists.
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
