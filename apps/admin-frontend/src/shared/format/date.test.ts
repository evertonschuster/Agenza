import { describe, expect, it } from 'vitest';
import {
  daysInMonth,
  formatMaskedDate,
  isoToLocalDate,
  localDateToIso,
  maskDate,
  parseMaskedDate,
  todayLocal,
} from './date';

describe('todayLocal', () => {
  it.each([
    [new Date(2026, 9, 2, 12, 0), '2026-10-02'],
    [new Date(2026, 9, 2, 23, 59, 59), '2026-10-02'],
    [new Date(2026, 9, 3, 0, 0, 0), '2026-10-03'],
    [new Date(2025, 11, 31, 23, 30), '2025-12-31'],
    [new Date(2026, 0, 1, 0, 30), '2026-01-01'],
  ] as const)('reads %s as the calendar day on the device, %s', (instant, expected) => {
    expect(todayLocal(instant)).toBe(expected);
  });

  it('defaults to the current instant', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
    ['10/03/2015', '2015-03-10'],
    ['01/01/1900', '1900-01-01'],
    ['29/02/2000', '2000-02-29'],
    [' 05/12/1990 ', '1990-12-05'],
  ] as const)('reads %j as %s', (masked, expected) => {
    expect(parseMaskedDate(masked)).toBe(expected);
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
  it('writes an ISO date as dd/mm/aaaa', () => {
    expect(formatMaskedDate('2015-03-10')).toBe('10/03/2015');
    expect(formatMaskedDate('1900-01-01')).toBe('01/01/1900');
  });

  it('round-trips with parseMaskedDate', () => {
    expect(parseMaskedDate(formatMaskedDate('2000-02-29'))).toBe('2000-02-29');
  });
});

describe('local date conversion', () => {
  it('turns an ISO date into the same calendar day in local time', () => {
    const date = isoToLocalDate('1990-05-20');

    expect(date.getFullYear()).toBe(1990);
    expect(date.getMonth()).toBe(4);
    expect(date.getDate()).toBe(20);
  });

  it.each(['1990-05-20', '2000-02-29', '1900-01-01', '2026-12-31'])(
    'round-trips %s through a local Date',
    (isoDate) => {
      expect(localDateToIso(isoToLocalDate(isoDate))).toBe(isoDate);
    },
  );
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
