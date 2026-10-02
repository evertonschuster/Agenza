export const ADULT_AGE_IN_YEARS = 18;
export const MAX_AGE_IN_YEARS = 120;

const MASKED_LENGTH = 10;

export function maskBirthDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseBirthDate(masked: string): string | null {
  const value = masked.trim();
  if (value.length !== MASKED_LENGTH) return null;

  const [day, month, year] = value.split('/').map(Number);
  if (day === undefined || month === undefined || year === undefined) return null;
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }

  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

export function calculateAge(birthDate: string, today: string): number {
  const birth = toParts(birthDate);
  const current = toParts(today);

  const age = current.year - birth.year;
  const birthdayThisYear = {
    month: birth.month,
    day: Math.min(birth.day, daysInMonth(current.year, birth.month)),
  };
  const hadBirthday =
    current.month > birthdayThisYear.month ||
    (current.month === birthdayThisYear.month && current.day >= birthdayThisYear.day);

  return hadBirthday ? age : age - 1;
}

export function isInThePast(birthDate: string, today: string): boolean {
  return birthDate < today;
}

export function isWithinMaxAge(birthDate: string, today: string): boolean {
  return calculateAge(birthDate, today) <= MAX_AGE_IN_YEARS;
}

export function isMinorOn(birthDate: string, today: string): boolean {
  return isInThePast(birthDate, today) && calculateAge(birthDate, today) < ADULT_AGE_IN_YEARS;
}

export function formatAge(age: number): string {
  if (age < 1) return 'menos de 1 ano';
  return age === 1 ? '1 ano' : `${age} anos`;
}

function toParts(isoDate: string): { year: number; month: number; day: number } {
  const [year = 0, month = 0, day = 0] = isoDate.split('-').map(Number);
  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}
