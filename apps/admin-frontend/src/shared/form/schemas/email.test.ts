import { describe, expect, it } from 'vitest';
import { EMAIL_MAX_LENGTH } from '@/shared/format/email';
import { emailSchema } from './email';

function messagesOf(raw: string): string[] | undefined {
  return emailSchema.safeParse(raw).error?.issues.map((issue) => issue.message);
}

describe('emailSchema', () => {
  it('stores the e-mail trimmed and in lowercase', () => {
    expect(emailSchema.parse(' Maria.Souza@Example.COM ')).toBe('maria.souza@example.com');
  });

  it('treats an empty field as no e-mail', () => {
    expect(emailSchema.parse('')).toBeNull();
  });

  it('explains an invalid format in pt-BR', () => {
    expect(messagesOf('maria@example')).toEqual(['Informe um e-mail válido.']);
  });

  it('reports a too-long e-mail once, as too long and not as invalid', () => {
    const tooLong = `${'a'.repeat(EMAIL_MAX_LENGTH)}@example.com`;

    expect(messagesOf(tooLong)).toEqual([
      `O e-mail deve ter no máximo ${EMAIL_MAX_LENGTH} caracteres.`,
    ]);
  });
});
