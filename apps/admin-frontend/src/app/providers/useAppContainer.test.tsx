import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAppContainer } from '@/app/providers/useAppContainer'
import { AppContainerContext } from '@/app/providers/AppContainerContext'
import { createFakeAppContainer } from '@/test/fixtures/createFakeAppContainer'

describe('useAppContainer', () => {
  it('throws a clear error when used outside AppContainerContext.Provider', () => {
    expect(() => renderHook(() => useAppContainer())).toThrow(
      /useAppContainer must be used within an AppContainerProvider/,
    )
  })

  it('returns the container when used inside the provider', () => {
    const fakeContainer = createFakeAppContainer()

    const { result } = renderHook(() => useAppContainer(), {
      wrapper: ({ children }) => (
        <AppContainerContext.Provider value={fakeContainer}>
          {children}
        </AppContainerContext.Provider>
      ),
    })

    expect(result.current).toBe(fakeContainer)
  })
})
