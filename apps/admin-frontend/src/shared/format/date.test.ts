import { describe, expect, it } from 'vitest';
import { todayInSaoPaulo } from './date';

describe('todayInSaoPaulo', () => {
  it.each([
    ['2026-10-02T15:00:00Z', '2026-10-02'],
    ['2026-10-03T02:59:59Z', '2026-10-02'],
    ['2026-10-03T03:00:00Z', '2026-10-03'],
    ['2026-01-01T02:00:00Z', '2025-12-31'],
  ] as const)('reads %s as the São Paulo calendar day %s', (instant, expected) => {
    expect(todayInSaoPaulo(new Date(instant))).toBe(expected);
  });

  it('defaults to the current instant', () => {
    expect(todayInSaoPaulo()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
