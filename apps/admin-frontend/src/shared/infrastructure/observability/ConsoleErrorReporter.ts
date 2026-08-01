import type { ErrorReporter, ErrorReporterContext } from '@/shared/application/ErrorReporter'

// Default adapter until a real backend (Sentry, Application Insights, a
// custom collection endpoint) is chosen - swap the instance built in
// main.tsx, nothing else in the app depends on this concrete class.
export class ConsoleErrorReporter implements ErrorReporter {
  report(error: unknown, context: ErrorReporterContext): void {
    console.error(`[ErrorReporter:${context.source}]`, error, context.extra ?? {})
  }
}
