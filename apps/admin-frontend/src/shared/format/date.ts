const MASKED_LENGTH = 10;

export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function todayLocal(now: Date = new Date()): Date {
  return utcDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function maskDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseMaskedDate(masked: string): Date | null {
  const value = masked.trim();
  if (value.length !== MASKED_LENGTH) return null;

  const [day, month, year] = value.split('/').map(Number);
  if (day === undefined || month === undefined || year === undefined) return null;
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }

  return utcDate(year, month, day);
}

export function formatMaskedDate(date: Date): string {
  const day = pad(date.getUTCDate(), 2);
  const month = pad(date.getUTCMonth() + 1, 2);
  return `${day}/${month}/${pad(date.getUTCFullYear(), 4)}`;
}

export function fullYearsBetween(from: Date, to: Date): number {
  const year = to.getUTCFullYear();
  const month = from.getUTCMonth() + 1;
  const anniversary = utcDate(year, month, Math.min(from.getUTCDate(), daysInMonth(year, month)));

  return year - from.getUTCFullYear() - (anniversary > to ? 1 : 0);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}
