const LOCALE = 'pt-BR';
const numberFormat = new Intl.NumberFormat(LOCALE);
const pluralRules = new Intl.PluralRules(LOCALE);

export interface CountNoun {
  singular: string;
  plural: string;
}

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatCount(count: number, noun: CountNoun): string {
  const word = pluralRules.select(count) === 'one' ? noun.singular : noun.plural;
  return `${formatNumber(count)} ${word}`;
}
