import { describe, expect, it } from 'vitest';
import { cpfSchema } from './cpf';

describe('cpfSchema', () => {
  it('stores the digits only, whatever mask the person typed', () => {
    expect(cpfSchema.parse('529.982.247-25')).toBe('52998224725');
  });

  it('treats an empty field as no CPF', () => {
    expect(cpfSchema.parse('  ')).toBeNull();
  });

  it('explains an invalid CPF in pt-BR', () => {
    const result = cpfSchema.safeParse('529.982.247-24');

    expect(result.error?.issues.map((issue) => issue.message)).toEqual(['Informe um CPF válido.']);
  });
});
