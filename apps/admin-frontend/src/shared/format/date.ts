export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function todayUtc(now: Date = new Date()): Date {
  return utcDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
}

export function parseIsoDate(iso: string): Date {
  return utcDate(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), Number(iso.slice(8, 10)));
}

export function fullYearsBetween(from: Date, to: Date): number {
  const year = to.getUTCFullYear();
  const month = from.getUTCMonth() + 1;
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const anniversary = utcDate(year, month, Math.min(from.getUTCDate(), lastDayOfMonth));

  return year - from.getUTCFullYear() - (anniversary > to ? 1 : 0);
}
