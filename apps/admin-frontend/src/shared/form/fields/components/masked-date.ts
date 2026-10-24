import { utcDate } from '@/shared/format/date';

const MASKED_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const MIN_YEAR = 1000;

export function maskDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseMaskedDate(masked: string): Date | null {
  const match = MASKED_DATE.exec(masked.trim());
  if (match === null) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < MIN_YEAR) return null;

  const date = utcDate(year, month, day);
  return date.getUTCMonth() + 1 === month && date.getUTCDate() === day ? date : null;
}

export function formatMaskedDate(date: Date): string {
  const day = pad(date.getUTCDate(), 2);
  const month = pad(date.getUTCMonth() + 1, 2);
  return `${day}/${month}/${pad(date.getUTCFullYear(), 4)}`;
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}
