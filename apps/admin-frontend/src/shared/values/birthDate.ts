import { fullYearsBetween, parseMaskedDate, todayUtc, utcDate } from '@/shared/format/date';
import { optionalValue } from './optionalValue';

export const ADULT_AGE_IN_YEARS = 18;
export const MAX_AGE_IN_YEARS = 120;

export function isInThePast(birthDate: Date, today: Date): boolean {
  return birthDate < today;
}

export function isWithinMaxAge(birthDate: Date, today: Date): boolean {
  return fullYearsBetween(birthDate, today) <= MAX_AGE_IN_YEARS;
}

export function isMinorOn(birthDate: Date, today: Date): boolean {
  return isInThePast(birthDate, today) && fullYearsBetween(birthDate, today) < ADULT_AGE_IN_YEARS;
}

export function ageFromBirthDate(masked: string, today: Date = todayUtc()): number | null {
  const birthDate = parseMaskedDate(masked);
  if (birthDate === null || !isInThePast(birthDate, today) || !isWithinMaxAge(birthDate, today)) {
    return null;
  }

  return fullYearsBetween(birthDate, today);
}

export function birthDatePickerBounds(today: Date = todayUtc()): { min: Date; max: Date } {
  return {
    min: utcDate(today.getUTCFullYear() - MAX_AGE_IN_YEARS - 1, 1, 1),
    max: utcDate(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate() - 1),
  };
}

export const birthDateSchema = optionalValue((raw, fail) => {
  const birthDate = parseMaskedDate(raw);
  if (birthDate === null) return fail('Informe uma data válida no formato dd/mm/aaaa.');

  const today = todayUtc();
  if (!isInThePast(birthDate, today)) return fail('A data de nascimento deve estar no passado.');
  if (!isWithinMaxAge(birthDate, today)) {
    return fail(`A data de nascimento não pode indicar idade superior a ${MAX_AGE_IN_YEARS} anos.`);
  }

  return birthDate;
});
