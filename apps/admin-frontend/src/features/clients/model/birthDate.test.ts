import { describe, expect, it } from 'vitest';
import {
  earliestBirthDate,
  formatAge,
  isInThePast,
  isMinorOn,
  isWithinMaxAge,
  latestBirthDate,
} from './birthDate';

const TODAY = '2026-10-02';

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

describe('birth date picker bounds', () => {
  it('ends the day before today, since a birth date must be in the past', () => {
    expect(latestBirthDate(TODAY)).toBe('2026-10-01');
    expect(isInThePast(latestBirthDate(TODAY), TODAY)).toBe(true);
  });

  it.each([
    ['2026-03-01', '2026-02-28'],
    ['2024-03-01', '2024-02-29'],
    ['2027-01-01', '2026-12-31'],
  ] as const)('ends the day before %s on %s', (today, expected) => {
    expect(latestBirthDate(today)).toBe(expected);
  });

  it('starts on January 1st of the first year that can still be within the maximum age', () => {
    expect(earliestBirthDate(TODAY)).toBe('1905-01-01');
    expect(isWithinMaxAge('1905-12-31', '2026-01-01')).toBe(true);
    expect(isWithinMaxAge('1905-01-01', '2026-12-31')).toBe(false);
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
