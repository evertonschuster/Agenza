import { fullYearsBetween, todayUtc, utcDate } from './date';

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

export function birthDatePickerBounds(today: Date = todayUtc()): { min: Date; max: Date } {
  return {
    min: utcDate(today.getUTCFullYear() - MAX_AGE_IN_YEARS - 1, 1, 1),
    max: utcDate(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate() - 1),
  };
}
