import { describe, it, expect, vi } from 'vitest'
import { InMemorySessionEventBus } from './InMemorySessionEventBus'

describe('InMemorySessionEventBus', () => {
  it('calls every subscribed listener when notifyUnauthenticated is called', () => {
    const bus = new InMemorySessionEventBus()
    const first = vi.fn()
    const second = vi.fn()
    bus.subscribe(first)
    bus.subscribe(second)

    bus.notifyUnauthenticated()

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('stops calling a listener once it unsubscribes', () => {
    const bus = new InMemorySessionEventBus()
    const listener = vi.fn()
    const unsubscribe = bus.subscribe(listener)

    unsubscribe()
    bus.notifyUnauthenticated()

    expect(listener).not.toHaveBeenCalled()
  })

  it('calls every listener again on a second, independent notification', () => {
    const bus = new InMemorySessionEventBus()
    const listener = vi.fn()
    bus.subscribe(listener)

    bus.notifyUnauthenticated()
    bus.notifyUnauthenticated()

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('does not throw when notified with no listeners subscribed', () => {
    const bus = new InMemorySessionEventBus()

    expect(() => {
      bus.notifyUnauthenticated()
    }).not.toThrow()
  })
})
