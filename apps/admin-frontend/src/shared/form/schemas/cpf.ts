import { parseCpf } from '@/shared/format/cpf';
import { optionalValue } from './optionalValue';

export const cpfSchema = optionalValue(
  (raw, fail) => parseCpf(raw) ?? fail('Informe um CPF válido.'),
);
