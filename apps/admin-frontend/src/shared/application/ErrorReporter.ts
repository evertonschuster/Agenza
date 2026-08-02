export interface ErrorReporterContext {
  /** Which capture surface this came through - e.g. "react.onCaughtError", "window.unhandledrejection". */
  readonly source: string
  readonly extra?: Record<string, unknown>
}

// The one sink every genuinely-unexpected failure (a bug, not an expected
// Result.Failure) flows through - business/presentation code never reports
// directly, only the capture surfaces wired in main.tsx do (docs/adr/014).
export interface ErrorReporter {
  report(error: unknown, context: ErrorReporterContext): void
}
