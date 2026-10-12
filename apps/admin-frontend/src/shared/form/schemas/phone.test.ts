import { describe, expect, it } from 'vitest';
import { phoneSchema } from './phone';

describe('phoneSchema', () => {
  it('keeps the phone as typed, without the surrounding spaces', () => {
    expect(phoneSchema.parse('  (11) 99999-0000 ')).toBe('(11) 99999-0000');
  });

  it('treats an empty field as no phone', () => {
    expect(phoneSchema.parse('')).toBeNull();
  });

  it('explains the accepted shape in pt-BR', () => {
    const result = phoneSchema.safeParse('telefone');

    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'Informe um telefone válido, com até 20 caracteres entre dígitos, espaços, +, parênteses e hífen.',
    ]);
  });
});
