/** Regression fixtures for XSS/SQLi-style input - see docs/adr and the QA audit item on security tests. */
export const MALICIOUS_PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  "'; DROP TABLE Services; --",
] as const
