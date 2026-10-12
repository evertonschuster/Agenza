import { EMAIL_MAX_LENGTH, parseEmail } from '@/shared/format/email';
import { optionalValue } from './optionalValue';

export const emailSchema = optionalValue((raw, fail) => {
  if (raw.trim().length > EMAIL_MAX_LENGTH) {
    return fail(`O e-mail deve ter no máximo ${EMAIL_MAX_LENGTH} caracteres.`);
  }

  return parseEmail(raw) ?? fail('Informe um e-mail válido.');
});
