import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { utcDate } from '@/shared/format/date';
import { ageFromBirthDate, birthDateSchema } from './birthDate';

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-02T12:00:00Z'), toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
});

function messagesOf(raw: string): string[] | undefined {
  return birthDateSchema.safeParse(raw).error?.issues.map((issue) => issue.message);
}

describe('birthDateSchema', () => {
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

describe('ageFromBirthDate', () => {
  it.each([
    ['10/03/2015', 11],
    ['03/10/2008', 17],
    ['02/10/2008', 18],
    ['20/05/1990', 36],
    ['01/10/2026', 0],
    ['02/10/1906', 120],
  ] as const)('reads %j as %i years old today', (birthDate, expected) => {
    expect(ageFromBirthDate(birthDate)).toBe(expected);
  });

  it.each(['', '10/03', '31/02/2020', '02/10/2026', '01/01/2030', '02/10/1905'])(
    'has no age for %j',
    (birthDate) => {
      expect(ageFromBirthDate(birthDate)).toBeNull();
    },
  );
});
