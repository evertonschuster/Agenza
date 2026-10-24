import { describe, expect, it, vi } from 'vitest';
import { fullYearsBetween, parseIsoDate, todayUtc, utcDate } from './date';

describe('utcDate', () => {
  it('is the calendar day at midnight UTC, with a 1-based month', () => {
    expect(utcDate(1990, 5, 20).toISOString()).toBe('1990-05-20T00:00:00.000Z');
  });
});

describe('todayUtc', () => {
  it.each([
    ['2026-10-02T00:00:00Z', utcDate(2026, 10, 2)],
    ['2026-10-02T23:59:59Z', utcDate(2026, 10, 2)],
    ['2025-12-31T23:30:00Z', utcDate(2025, 12, 31)],
    ['2026-01-01T00:30:00Z', utcDate(2026, 1, 1)],
  ] as const)('reads %s as that UTC calendar day, at midnight', (instant, expected) => {
    expect(todayUtc(new Date(instant))).toEqual(expected);
  });

  it('defaults to the current instant', () => {
    vi.useFakeTimers({ now: new Date('2026-10-02T12:00:00Z'), toFake: ['Date'] });

    expect(todayUtc()).toEqual(utcDate(2026, 10, 2));

    vi.useRealTimers();
  });
});

describe('parseIsoDate', () => {
  it('reads yyyy-MM-dd as midnight UTC of that day', () => {
    expect(parseIsoDate('2015-03-10')).toEqual(new Date('2015-03-10T00:00:00Z'));
    expect(parseIsoDate('1900-01-01')).toEqual(utcDate(1900, 1, 1));
  });
});

describe('fullYearsBetween', () => {
  it.each([
    ['2008-10-02', '2026-10-02', 18],
    ['2008-10-03', '2026-10-02', 17],
    ['2008-10-01', '2026-10-02', 18],
    ['2026-10-01', '2026-10-02', 0],
    ['2026-10-02', '2026-10-02', 0],
    ['2000-02-29', '2026-10-02', 26],
    ['1906-10-02', '2026-10-02', 120],
    ['1906-10-03', '2026-10-02', 119],
    ['1905-10-02', '2026-10-02', 121],
  ] as const)('counts the completed years from %s to %s as %i', (from, to, expected) => {
    expect(fullYearsBetween(new Date(from), new Date(to))).toBe(expected);
  });

  it('moves a February 29 anniversary to February 28 in common years, like the backend', () => {
    const birth = utcDate(2008, 2, 29);

    expect(fullYearsBetween(birth, utcDate(2026, 2, 27))).toBe(17);
    expect(fullYearsBetween(birth, utcDate(2026, 2, 28))).toBe(18);
    expect(fullYearsBetween(birth, utcDate(2028, 2, 28))).toBe(19);
    expect(fullYearsBetween(birth, utcDate(2028, 2, 29))).toBe(20);
  });

  it('counts below zero when the end comes before the start', () => {
    expect(fullYearsBetween(utcDate(2026, 10, 3), utcDate(2026, 10, 2))).toBe(-1);
    expect(fullYearsBetween(utcDate(2026, 10, 2), utcDate(2025, 10, 2))).toBe(-1);
    expect(fullYearsBetween(utcDate(2026, 10, 2), utcDate(2025, 10, 1))).toBe(-2);
  });
});
