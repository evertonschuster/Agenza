import { describe, expect, it } from 'vitest';
import { ok, fail, type Result } from './result';

describe('Result', () => {
  it('ok() carries the value on the success branch', () => {
    const r: Result<number, string> = ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBe(42);
  });

  it('fail() carries the error on the failure branch', () => {
    const r: Result<number, string> = fail('nope');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('nope');
  });
});
