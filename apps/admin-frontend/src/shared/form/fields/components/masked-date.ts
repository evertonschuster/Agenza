import { utcDate } from '@/shared/format/date';

type DatePart = 'day' | 'month' | 'year';

export interface DateLayout {
  order: readonly DatePart[];
  separator: string;
  formatter: Intl.DateTimeFormat;
}

const DIGITS: Record<DatePart, number> = { day: 2, month: 2, year: 4 };
const PLACEHOLDER: Record<DatePart, string> = { day: 'dd', month: 'mm', year: 'aaaa' };
const MIN_YEAR = 1000;

export function dateLayoutOf(locale: string): DateLayout {
  const formatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
    numberingSystem: 'latn',
  });
  const parts = formatter.formatToParts(utcDate(2000, 1, 2));
  const order = parts.flatMap((part) =>
    part.type === 'day' || part.type === 'month' || part.type === 'year' ? [part.type] : [],
  );
  const separator = parts[1]?.type === 'literal' ? parts[1].value : '/';

  return { order, separator, formatter };
}

export function datePlaceholder(layout: DateLayout): string {
  return layout.order.map((part) => PLACEHOLDER[part]).join(layout.separator);
}

export function maskDate(value: string, layout: DateLayout): string {
  let digits = value.replace(/\D/g, '').slice(0, 8);
  const pieces: string[] = [];
  for (const part of layout.order) {
    if (digits === '') break;
    pieces.push(digits.slice(0, DIGITS[part]));
    digits = digits.slice(DIGITS[part]);
  }

  return pieces.join(layout.separator);
}

export function parseMaskedDate(masked: string, layout: DateLayout): Date | null {
  const pieces = masked.split(layout.separator);
  const isWhole =
    pieces.length === layout.order.length &&
    layout.order.every((part, index) => {
      const piece = pieces[index] ?? '';
      return piece.length === DIGITS[part] && /^\d+$/.test(piece);
    });
  if (!isWhole) return null;

  const valueOf = (part: DatePart) => Number(pieces[layout.order.indexOf(part)]);
  const day = valueOf('day');
  const month = valueOf('month');
  const year = valueOf('year');
  if (year < MIN_YEAR) return null;

  const date = utcDate(year, month, day);
  return date.getUTCMonth() + 1 === month && date.getUTCDate() === day ? date : null;
}

export function formatMaskedDate(date: Date, layout: DateLayout): string {
  const parts = layout.formatter.formatToParts(date);
  const valueOf = (part: DatePart) => parts.find(({ type }) => type === part)?.value ?? '';

  return layout.order.map(valueOf).join(layout.separator);
}
