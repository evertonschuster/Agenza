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
    ['10/03/2015', 11],
    ['03/10/2008', 17],
    ['02/10/2008', 18],
    ['20/05/1990', 36],
    ['01/10/2026', 0],
    ['02/10/1906', 120],
  ] as const)('reads %j as %i years old today', (birthDate, expected) => {
    expect(ageFromBirthDate(birthDate, TODAY)).toBe(expected);
  });

  it.each(['', '10/03', '31/02/2020', '02/10/2026', '01/01/2030', '02/10/1905'])(
    'has no age for %j',
    (birthDate) => {
      expect(ageFromBirthDate(birthDate, TODAY)).toBeNull();
    },
  );

  it('reads today from the clock when none is given', () => {
    vi.useFakeTimers({ now: new Date('2026-10-02T12:00:00Z'), toFake: ['Date'] });

    expect(ageFromBirthDate('03/10/2008')).toBe(17);

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

  function messagesOf(raw: string): string[] | undefined {
    return birthDateSchema.safeParse(raw).error?.issues.map((issue) => issue.message);
  }

  it('reads dd/mm/aaaa as a Date at midnight UTC', () => {
    expect(birthDateSchema.parse('20/05/1990')).toEqual(utcDate(1990, 5, 20));
  });

  it.each(['', '  '])('treats %j as no birth date', (raw) => {
    expect(birthDateSchema.parse(raw)).toBeNull();
  });

  it.each([
    ['10/03', 'Informe uma data válida no formato dd/mm/aaaa.'],
    ['31/02/2020', 'Informe uma data válida no formato dd/mm/aaaa.'],
    ['02/10/2026', 'A data de nascimento deve estar no passado.'],
    ['01/01/2030', 'A data de nascimento deve estar no passado.'],
    ['02/10/1905', 'A data de nascimento não pode indicar idade superior a 120 anos.'],
  ] as const)('explains %j in pt-BR', (raw, message) => {
    expect(messagesOf(raw)).toEqual([message]);
  });
});
