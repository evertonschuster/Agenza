// A stale chunk after a deploy fails differently per bundler (Vite/esbuild:
// "Failed to fetch dynamically imported module"; webpack: ChunkLoadError) -
// neither recovers by re-rendering, only a full reload does.
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
