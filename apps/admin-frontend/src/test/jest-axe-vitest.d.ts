import 'vitest'

// @types/jest-axe only augments jest's own Matchers interface - this
// mirrors that same shape for vitest's Assertion/AsymmetricMatchersContaining
// so `expect(container).toHaveNoViolations()` type-checks here too.
interface AxeMatchers<R = unknown> {
  toHaveNoViolations(): R
}

declare module 'vitest' {
  // Empty bodies are the standard shape for this kind of declaration merge
  // (see @testing-library/jest-dom's own vitest.d.ts) - there's no other way
  // to add a matcher to vitest's existing Assertion interface.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends AxeMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
