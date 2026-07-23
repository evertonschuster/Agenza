import { describe, it, expect } from 'vitest'
import { isChunkLoadError } from './isChunkLoadError'

describe('isChunkLoadError', () => {
  it('returns false for a non-Error value', () => {
    expect(isChunkLoadError('boom')).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
  })

  it('returns false for a regular rendering error', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false)
  })

  it('returns true for a Vite/esbuild dynamic import failure', () => {
    expect(
      isChunkLoadError(
        new Error('Failed to fetch dynamically imported module: https://app/assets/Foo-abc.js'),
      ),
    ).toBe(true)
  })

  it('returns true for a webpack-style ChunkLoadError by name', () => {
    const error = new Error('Loading chunk 4 failed.')
    error.name = 'ChunkLoadError'
    expect(isChunkLoadError(error)).toBe(true)
  })

  it('returns true for a "Loading chunk N failed" message regardless of name', () => {
    expect(isChunkLoadError(new Error('Loading chunk 12 failed.'))).toBe(true)
  })
})
