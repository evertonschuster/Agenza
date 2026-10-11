import { describe, expect, it, vi } from 'vitest';
import {
  addDays,
  daysInMonth,
  formatMaskedDate,
  fullYearsBetween,
  utcDate,
  maskDate,
  parseMaskedDate,
  todayLocal,
} from './date';

describe('utcDate', () => {
  it('builds the calendar day at midnight UTC, with a 1-based month', () => {
    expect(utcDate(1990, 5, 20).toISOString()).toBe('1990-05-20T00:00:00.000Z');
  });
});

describe('todayLocal', () => {
  it.each([
    [new Date(2026, 9, 2, 12, 0), utcDate(2026, 10, 2)],
    [new Date(2026, 9, 2, 23, 59, 59), utcDate(2026, 10, 2)],
    [new Date(2026, 9, 3, 0, 0, 0), utcDate(2026, 10, 3)],
    [new Date(2025, 11, 31, 23, 30), utcDate(2025, 12, 31)],
    [new Date(2026, 0, 1, 0, 30), utcDate(2026, 1, 1)],
  ] as const)(
    'reads %s as the calendar day on the device, held as midnight UTC (%s)',
    (instant, expected) => {
      expect(todayLocal(instant)).toEqual(expected);
    },
  );

  it('defaults to the current instant', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 2, 12, 0), toFake: ['Date'] });

    expect(todayLocal()).toEqual(utcDate(2026, 10, 2));

    vi.useRealTimers();
  });
});

describe('addDays', () => {
  it.each([
    [utcDate(2026, 10, 2), 1, utcDate(2026, 10, 3)],
    [utcDate(2026, 10, 2), -1, utcDate(2026, 10, 1)],
    [utcDate(2026, 3, 1), -1, utcDate(2026, 2, 28)],
    [utcDate(2024, 3, 1), -1, utcDate(2024, 2, 29)],
    [utcDate(2027, 1, 1), -1, utcDate(2026, 12, 31)],
    [utcDate(2026, 12, 31), 1, utcDate(2027, 1, 1)],
    [utcDate(2026, 10, 2), 0, utcDate(2026, 10, 2)],
  ] as const)('moves %s by %i days to %s', (date, days, expected) => {
    expect(addDays(date, days)).toEqual(expected);
  });

  it('leaves the original date untouched', () => {
    const date = utcDate(2026, 10, 2);

    addDays(date, 5);

    expect(date).toEqual(utcDate(2026, 10, 2));
  });
});

describe('maskDate', () => {
  it.each([
    ['', ''],
    ['1', '1'],
    ['10', '10'],
    ['103', '10/3'],
    ['1003', '10/03'],
    ['10032', '10/03/2'],
    ['10032015', '10/03/2015'],
    ['100320159999', '10/03/2015'],
    ['10/03/2015', '10/03/2015'],
    ['ab10-03', '10/03'],
  ] as const)('masks %j as %j while typing', (typed, expected) => {
    expect(maskDate(typed)).toBe(expected);
  });
});

describe('parseMaskedDate', () => {
  it.each([
    ['10/03/2015', utcDate(2015, 3, 10)],
    ['01/01/1900', utcDate(1900, 1, 1)],
    ['29/02/2000', utcDate(2000, 2, 29)],
    [' 05/12/1990 ', utcDate(1990, 12, 5)],
  ] as const)('reads %j as %s', (masked, expected) => {
    expect(parseMaskedDate(masked)).toEqual(expected);
  });

  it.each([
    '',
    '10/03',
    '10/03/15',
    '31/02/2020',
    '29/02/2001',
    '00/10/2020',
    '10/00/2020',
    '10/13/2020',
    '32/01/2020',
    '10/03/0999',
    'aa/bb/cccc',
    '10-03-2015',
  ])('rejects %j', (masked) => {
    expect(parseMaskedDate(masked)).toBeNull();
  });
});

describe('formatMaskedDate', () => {
  it('writes a date as dd/mm/aaaa', () => {
    expect(formatMaskedDate(utcDate(2015, 3, 10))).toBe('10/03/2015');
    expect(formatMaskedDate(utcDate(1900, 1, 1))).toBe('01/01/1900');
  });

  it('shows the UTC calendar day, whatever the zone of the device', () => {
    expect(formatMaskedDate(new Date('2015-03-10T00:00:00Z'))).toBe('10/03/2015');
    expect(formatMaskedDate(new Date('2015-03-10T23:59:59Z'))).toBe('10/03/2015');
  });

  it('round-trips with parseMaskedDate', () => {
    expect(parseMaskedDate(formatMaskedDate(utcDate(2000, 2, 29)))).toEqual(utcDate(2000, 2, 29));
  });
});

describe('daysInMonth', () => {
  it.each([
    [2024, 2, 29],
    [2025, 2, 28],
    [1900, 2, 28],
    [2000, 2, 29],
    [2026, 4, 30],
    [2026, 12, 31],
  ] as const)('counts %i-%i as %i days', (year, month, expected) => {
    expect(daysInMonth(year, month)).toBe(expected);
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

  it('counts calendar days, whatever the time of day of either date', () => {
    expect(
      fullYearsBetween(new Date('2008-10-02T23:59:00Z'), new Date('2026-10-02T00:01:00Z')),
    ).toBe(18);
  });
});
