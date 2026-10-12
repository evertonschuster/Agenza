import { PHONE_MAX_LENGTH, parsePhone } from '@/shared/format/phone';
import { optionalValue } from './optionalValue';

export const phoneSchema = optionalValue(
  (raw, fail) =>
    parsePhone(raw) ??
    fail(
      `Informe um telefone válido, com até ${PHONE_MAX_LENGTH} caracteres entre dígitos, espaços, +, parênteses e hífen.`,
    ),
);
