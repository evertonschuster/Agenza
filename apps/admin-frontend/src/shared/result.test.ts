import { describe, expect, it } from 'vitest';
import { ok, fail, mapOk, type Result } from './result';

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

describe('mapOk', () => {
  it('transforms the value on the ok branch', () => {
    expect(mapOk(ok(2), (n) => n * 10)).toEqual({ ok: true, data: 20 });
  });

  it('returns the failure untouched on the fail branch', () => {
    const failure = fail('boom');
    expect(mapOk(failure, (n: number) => n * 10)).toBe(failure);
  });
});
