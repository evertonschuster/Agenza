/**
 * A stale lazy-loaded chunk reference (e.g. the user still has an old
 * index.html open after a new deploy replaced the built asset files) fails
 * differently from a genuine rendering bug - vite/esbuild-bundled dynamic
 * imports reject with "Failed to fetch dynamically imported module", while
 * webpack-style bundlers historically threw a named ChunkLoadError. Neither
 * case can be recovered by simply re-rendering the same tree; only a full
 * reload (fetching the new asset manifest) fixes it.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.name === 'ChunkLoadError' ||
    /failed to fetch dynamically imported module/i.test(error.message) ||
    /loading chunk .* failed/i.test(error.message)
  )
}
