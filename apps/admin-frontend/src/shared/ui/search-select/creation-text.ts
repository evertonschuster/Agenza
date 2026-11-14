import type { CreationTextArgs } from './search-select.types';

function fold(name: string) {
  return name.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}

function showsResultsFor(args: CreationTextArgs, text: string) {
  const { searched, phase } = args;
  if (searched.trim() !== text) return false;
  return phase.kind === 'ready' || phase.kind === 'loadingNext';
}

export function creationTextOf(args: CreationTextArgs): string {
  const text = args.text.trim();
  if (!text) return '';
  if (!showsResultsFor(args, text)) return text;

  const folded = fold(text);
  const exists = args.items.some((item) => fold(item.name) === folded);
  return exists ? '' : text;
}
