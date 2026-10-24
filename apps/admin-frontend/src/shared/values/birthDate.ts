import { z } from 'zod';
import { fullYearsBetween, todayUtc, utcDate } from '@/shared/format/date';

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

export function ageFromBirthDate(birthDate: Date | null, today: Date = todayUtc()): number | null {
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

export const birthDateSchema = z
  .date({ error: 'Informe uma data válida.' })
  .nullable()
  .refine(
    (birthDate) => birthDate === null || isInThePast(birthDate, todayUtc()),
    'A data de nascimento deve estar no passado.',
  )
  .refine(
    (birthDate) => birthDate === null || isWithinMaxAge(birthDate, todayUtc()),
    `A data de nascimento não pode indicar idade superior a ${MAX_AGE_IN_YEARS} anos.`,
  );
