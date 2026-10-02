const dateParts = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayInSaoPaulo(now: Date = new Date()): string {
  const parts = Object.fromEntries(
    dateParts.formatToParts(now).map((part) => [part.type, part.value]),
  );
  return `${parts['year']}-${parts['month']}-${parts['day']}`;
}
