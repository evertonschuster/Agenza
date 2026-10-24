import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { utcDate } from '@/shared/format/date';
import {
  ageFromBirthDate,
  birthDatePickerBounds,
  birthDateSchema,
  isInThePast,
  isMinorOn,
  isWithinMaxAge,
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

describe('birthDatePickerBounds', () => {
  it('ends the day before today, since a birth date must be in the past', () => {
    const { max } = birthDatePickerBounds(TODAY);

    expect(max).toEqual(utcDate(2026, 10, 1));
    expect(isInThePast(max, TODAY)).toBe(true);
  });

  it.each([
    [utcDate(2026, 3, 1), utcDate(2026, 2, 28)],
    [utcDate(2024, 3, 1), utcDate(2024, 2, 29)],
    [utcDate(2027, 1, 1), utcDate(2026, 12, 31)],
  ] as const)('ends the day before %s on %s', (today, expected) => {
    expect(birthDatePickerBounds(today).max).toEqual(expected);
  });

  it('starts on January 1st of the first year that can still be within the maximum age', () => {
    expect(birthDatePickerBounds(TODAY).min).toEqual(utcDate(1905, 1, 1));
    expect(isWithinMaxAge(utcDate(1905, 12, 31), utcDate(2026, 1, 1))).toBe(true);
    expect(isWithinMaxAge(utcDate(1905, 1, 1), utcDate(2026, 12, 31))).toBe(false);
  });

  it('reads today from the clock when none is given', () => {
    vi.useFakeTimers({ now: new Date('2026-10-02T12:00:00Z'), toFake: ['Date'] });

    expect(birthDatePickerBounds()).toEqual({
      min: utcDate(1905, 1, 1),
      max: utcDate(2026, 10, 1),
    });

    vi.useRealTimers();
  });
});

describe('ageFromBirthDate', () => {
  it.each([
    [utcDate(2015, 3, 10), 11],
    [utcDate(2008, 10, 3), 17],
    [utcDate(2008, 10, 2), 18],
    [utcDate(1990, 5, 20), 36],
    [utcDate(2026, 10, 1), 0],
    [utcDate(1906, 10, 2), 120],
  ] as const)('reads %s as %i years old today', (birthDate, expected) => {
    expect(ageFromBirthDate(birthDate, TODAY)).toBe(expected);
  });

  it.each([null, utcDate(2026, 10, 2), utcDate(2030, 1, 1), utcDate(1905, 10, 2)])(
    'has no age for %s',
    (birthDate) => {
      expect(ageFromBirthDate(birthDate, TODAY)).toBeNull();
    },
  );

  it('reads today from the clock when none is given', () => {
    vi.useFakeTimers({ now: new Date('2026-10-02T12:00:00Z'), toFake: ['Date'] });

    expect(ageFromBirthDate(utcDate(2008, 10, 3))).toBe(17);

    vi.useRealTimers();
  });
});

describe('birthDateSchema', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-10-02T12:00:00Z'), toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function messagesOf(birthDate: Date): string[] | undefined {
    return birthDateSchema.safeParse(birthDate).error?.issues.map((issue) => issue.message);
  }

  it('accepts a date in the past within the maximum age as it is', () => {
    expect(birthDateSchema.parse(utcDate(1990, 5, 20))).toEqual(utcDate(1990, 5, 20));
  });

  it('accepts no birth date', () => {
    expect(birthDateSchema.parse(null)).toBeNull();
  });

  it.each([
    [utcDate(2026, 10, 2), 'A data de nascimento deve estar no passado.'],
    [utcDate(2030, 1, 1), 'A data de nascimento deve estar no passado.'],
    [utcDate(1905, 10, 2), 'A data de nascimento não pode indicar idade superior a 120 anos.'],
  ] as const)('explains %s in pt-BR', (birthDate, message) => {
    expect(messagesOf(birthDate)).toEqual([message]);
  });
});
