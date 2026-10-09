import { fullYearsBetween, isoToLocalDate, localDateToIso } from '@/shared/format/date';

export const ADULT_AGE_IN_YEARS = 18;
export const MAX_AGE_IN_YEARS = 120;

export function isInThePast(birthDate: string, today: string): boolean {
  return birthDate < today;
}

export function isWithinMaxAge(birthDate: string, today: string): boolean {
  return fullYearsBetween(birthDate, today) <= MAX_AGE_IN_YEARS;
}

export function isMinorOn(birthDate: string, today: string): boolean {
  return isInThePast(birthDate, today) && fullYearsBetween(birthDate, today) < ADULT_AGE_IN_YEARS;
}

export function latestBirthDate(today: string): string {
  const yesterday = isoToLocalDate(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return localDateToIso(yesterday);
}

export function earliestBirthDate(today: string): string {
  const year = Number(today.slice(0, 4)) - MAX_AGE_IN_YEARS - 1;
  return `${year}-01-01`;
}

export function formatAge(age: number): string {
  if (age < 1) return 'menos de 1 ano';
  return age === 1 ? '1 ano' : `${age} anos`;
}
