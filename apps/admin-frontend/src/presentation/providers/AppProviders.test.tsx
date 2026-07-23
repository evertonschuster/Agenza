import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppProviders } from './AppProviders'
import { useAppContainer } from '../hooks/useAppContainer'
import { createFakeAppContainer } from '../../test/fixtures/createFakeAppContainer'
import type { AppContainer } from '../../composition/container'
import type { JSX } from 'react'

describe('AppProviders', () => {
  it('provides the given container to descendants', () => {
    const container = createFakeAppContainer()
    let received: AppContainer | null = null

    function Consumer(): JSX.Element {
      received = useAppContainer()
      return <div>container ready</div>
    }

    render(
      <AppProviders container={container}>
        <Consumer />
      </AppProviders>,
    )

    expect(screen.getByText('container ready')).toBeInTheDocument()
    expect(received).toBe(container)
  })

  it('exposes the exact same container reference to every consumer', () => {
    const container = createFakeAppContainer()
    const seen: AppContainer[] = []

    function Consumer(): JSX.Element {
      seen.push(useAppContainer())
      return <div>child</div>
    }

    const { rerender } = render(
      <AppProviders container={container}>
        <Consumer />
      </AppProviders>,
    )
    rerender(
      <AppProviders container={container}>
        <Consumer />
      </AppProviders>,
    )

    expect(seen.length).toBeGreaterThanOrEqual(2)
    expect(new Set(seen).size).toBe(1)
  })
})
