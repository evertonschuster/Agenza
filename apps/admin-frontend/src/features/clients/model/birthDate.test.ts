import { describe, expect, it } from 'vitest';
import {
  calculateAge,
  formatAge,
  isInThePast,
  isMinorOn,
  isWithinMaxAge,
  maskBirthDate,
  parseBirthDate,
} from './birthDate';

const TODAY = '2026-10-02';

describe('maskBirthDate', () => {
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
    expect(maskBirthDate(typed)).toBe(expected);
  });
});

describe('parseBirthDate', () => {
  it.each([
    ['10/03/2015', '2015-03-10'],
    ['01/01/1900', '1900-01-01'],
    ['29/02/2000', '2000-02-29'],
    [' 05/12/1990 ', '1990-12-05'],
  ] as const)('reads %j as %s', (masked, expected) => {
    expect(parseBirthDate(masked)).toBe(expected);
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
    expect(parseBirthDate(masked)).toBeNull();
  });
});

describe('calculateAge', () => {
  it.each([
    ['2008-10-02', 18],
    ['2008-10-03', 17],
    ['2008-10-01', 18],
    ['2026-10-01', 0],
    ['2000-02-29', 26],
    ['1906-10-02', 120],
    ['1906-10-03', 119],
    ['1905-10-02', 121],
  ] as const)('counts completed years for %s as %i', (birthDate, expected) => {
    expect(calculateAge(birthDate, TODAY)).toBe(expected);
  });

  it('treats a leap-day birthday as February 28 in common years, like the backend', () => {
    expect(calculateAge('2008-02-29', '2026-02-27')).toBe(17);
    expect(calculateAge('2008-02-29', '2026-02-28')).toBe(18);
    expect(calculateAge('2008-02-29', '2028-02-28')).toBe(19);
    expect(calculateAge('2008-02-29', '2028-02-29')).toBe(20);
  });
});

describe('birth date rules', () => {
  it('requires a date strictly in the past', () => {
    expect(isInThePast('2026-10-01', TODAY)).toBe(true);
    expect(isInThePast('2026-10-02', TODAY)).toBe(false);
    expect(isInThePast('2026-10-03', TODAY)).toBe(false);
  });

  it('accepts up to 120 years and rejects 121', () => {
    expect(isWithinMaxAge('1906-10-02', TODAY)).toBe(true);
    expect(isWithinMaxAge('1905-10-02', TODAY)).toBe(false);
  });

  it('is a minor until the eighteenth birthday', () => {
    expect(isMinorOn('2008-10-03', TODAY)).toBe(true);
    expect(isMinorOn('2008-10-02', TODAY)).toBe(false);
    expect(isMinorOn('2026-10-01', TODAY)).toBe(true);
    expect(isMinorOn('1990-01-01', TODAY)).toBe(false);
  });

  it('is never a minor on a date that is not in the past', () => {
    expect(isMinorOn('2026-10-03', TODAY)).toBe(false);
    expect(isMinorOn('2026-10-02', TODAY)).toBe(false);
  });
});

describe('formatAge', () => {
  it.each([
    [0, 'menos de 1 ano'],
    [1, '1 ano'],
    [2, '2 anos'],
    [17, '17 anos'],
    [120, '120 anos'],
  ] as const)('writes %i as %j', (age, expected) => {
    expect(formatAge(age)).toBe(expected);
  });
});
