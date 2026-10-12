import { optionalValue } from './optionalValue';

export const PHONE_MAX_LENGTH = 20;

export function parsePhone(raw: string): string | null {
  const phone = raw.trim();
  const hasValidShape =
    phone.length <= PHONE_MAX_LENGTH && /\d/.test(phone) && /^[\d +()-]+$/.test(phone);

  return hasValidShape ? phone : null;
}

export const phoneSchema = optionalValue(
  (raw, fail) =>
    parsePhone(raw) ??
    fail(
      `Informe um telefone válido, com até ${PHONE_MAX_LENGTH} caracteres entre dígitos, espaços, +, parênteses e hífen.`,
    ),
);
