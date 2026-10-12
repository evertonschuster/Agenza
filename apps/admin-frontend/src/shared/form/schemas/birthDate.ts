import { MAX_AGE_IN_YEARS, isInThePast, isWithinMaxAge } from '@/shared/format/birthDate';
import { fullYearsBetween, parseMaskedDate, todayUtc } from '@/shared/format/date';
import { optionalValue } from './optionalValue';

export const birthDateSchema = optionalValue((raw, fail) => {
  const birthDate = parseMaskedDate(raw);
  if (birthDate === null) return fail('Informe uma data válida no formato dd/mm/aaaa.');

  const today = todayUtc();
  if (!isInThePast(birthDate, today)) return fail('A data de nascimento deve estar no passado.');
  if (!isWithinMaxAge(birthDate, today)) {
    return fail(`A data de nascimento não pode indicar idade superior a ${MAX_AGE_IN_YEARS} anos.`);
  }

  return birthDate;
});

export function ageFromBirthDate(masked: string): number | null {
  const birthDate = parseBirthDate(masked);
  if (birthDate === null) return null;

  return fullYearsBetween(birthDate, todayUtc());
}

function parseBirthDate(masked: string): Date | null {
  const parsed = birthDateSchema.safeParse(masked);
  return parsed.success ? parsed.data : null;
}
