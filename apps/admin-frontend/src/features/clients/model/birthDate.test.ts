import { describe, expect, it } from 'vitest';
import { utcDate } from '@/shared/format/date';
import {
  earliestBirthDate,
  formatAge,
  isInThePast,
  isMinorOn,
  isWithinMaxAge,
  latestBirthDate,
} from './birthDate';

const TODAY = utcDate(2026, 10, 2);

describe('birth date rules', () => {
  it('requires a date strictly in the past', () => {
    expect(isInThePast(utcDate(2026, 10, 1), TODAY)).toBe(true);
    expect(isInThePast(utcDate(2026, 10, 2), TODAY)).toBe(false);
    expect(isInThePast(utcDate(2026, 10, 3), TODAY)).toBe(false);
  });

  it('accepts up to 120 years and rejects 121', () => {
    expect(isWithinMaxAge(utcDate(1906, 10, 2), TODAY)).toBe(true);
    expect(isWithinMaxAge(utcDate(1905, 10, 2), TODAY)).toBe(false);
  });

  it('is a minor until the eighteenth birthday', () => {
    expect(isMinorOn(utcDate(2008, 10, 3), TODAY)).toBe(true);
    expect(isMinorOn(utcDate(2008, 10, 2), TODAY)).toBe(false);
    expect(isMinorOn(utcDate(2026, 10, 1), TODAY)).toBe(true);
    expect(isMinorOn(utcDate(1990, 1, 1), TODAY)).toBe(false);
  });

  it('is never a minor on a date that is not in the past', () => {
    expect(isMinorOn(utcDate(2026, 10, 3), TODAY)).toBe(false);
    expect(isMinorOn(utcDate(2026, 10, 2), TODAY)).toBe(false);
  });
});

describe('birth date picker bounds', () => {
  it('ends the day before today, since a birth date must be in the past', () => {
    expect(latestBirthDate(TODAY)).toEqual(utcDate(2026, 10, 1));
    expect(isInThePast(latestBirthDate(TODAY), TODAY)).toBe(true);
  });

  it.each([
    [utcDate(2026, 3, 1), utcDate(2026, 2, 28)],
    [utcDate(2024, 3, 1), utcDate(2024, 2, 29)],
    [utcDate(2027, 1, 1), utcDate(2026, 12, 31)],
  ] as const)('ends the day before %s on %s', (today, expected) => {
    expect(latestBirthDate(today)).toEqual(expected);
  });

  it('starts on January 1st of the first year that can still be within the maximum age', () => {
    expect(earliestBirthDate(TODAY)).toEqual(utcDate(1905, 1, 1));
    expect(isWithinMaxAge(utcDate(1905, 12, 31), utcDate(2026, 1, 1))).toBe(true);
    expect(isWithinMaxAge(utcDate(1905, 1, 1), utcDate(2026, 12, 31))).toBe(false);
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
