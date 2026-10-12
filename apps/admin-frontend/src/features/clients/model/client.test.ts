import { describe, expect, it, vi } from 'vitest';
import { utcDate } from '@/shared/format/date';
import { needsGuardian } from './client';

const TODAY = utcDate(2026, 10, 2);

describe('needsGuardian', () => {
  it('asks for a guardian for a minor without one', () => {
    expect(needsGuardian(utcDate(2015, 3, 10), 0, TODAY)).toBe(true);
    expect(needsGuardian(utcDate(2008, 10, 3), 0, TODAY)).toBe(true);
  });

  it('is satisfied once a minor has a guardian', () => {
    expect(needsGuardian(utcDate(2015, 3, 10), 1, TODAY)).toBe(false);
  });

  it.each([
    ['no birth date', null],
    ['an adult', utcDate(1990, 5, 20)],
    ['someone turning 18 today', utcDate(2008, 10, 2)],
    ['a birth date today', utcDate(2026, 10, 2)],
    ['a birth date in the future', utcDate(2027, 1, 1)],
  ] as const)('does not ask for a guardian for %s', (_, birthDate) => {
    expect(needsGuardian(birthDate, 0, TODAY)).toBe(false);
  });

  it('reads today from the clock when none is given', () => {
    vi.useFakeTimers({ now: new Date('2026-10-02T12:00:00Z'), toFake: ['Date'] });

    expect(needsGuardian(utcDate(2008, 10, 3), 0)).toBe(true);
    expect(needsGuardian(utcDate(2008, 10, 2), 0)).toBe(false);

    vi.useRealTimers();
  });
});
