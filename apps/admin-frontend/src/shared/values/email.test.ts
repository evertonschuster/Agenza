import { describe, expect, it } from 'vitest';
import { EMAIL_MAX_LENGTH, emailSchema, parseEmail } from './email';

describe('parseEmail', () => {
  it.each([
    ['maria@example.com', 'maria@example.com'],
    ['maria.souza+agenda@mail.example.com.br', 'maria.souza+agenda@mail.example.com.br'],
    ['a@b.co', 'a@b.co'],
    ['  Maria.Souza@Example.COM  ', 'maria.souza@example.com'],
  ] as const)('reads %j as %j', (email, expected) => {
    expect(parseEmail(email)).toBe(expected);
  });

  it('measures the trimmed, lowercased address against the limit', () => {
    const domain = '@example.com';
    const atTheLimit = `${'a'.repeat(EMAIL_MAX_LENGTH - domain.length)}${domain}`;

    expect(parseEmail(` ${atTheLimit} `)).toBe(atTheLimit);
    expect(parseEmail(`a${atTheLimit}`)).toBeNull();
  });

  it.each([
    '',
    '   ',
    'maria',
    'maria@',
    '@example.com',
    'maria@example',
    'maria@@example.com',
    'a@b@example.com',
    'maria@example..com',
    'maria@.example.com',
    'maria@example.com.',
    'maria souza@example.com',
  ])('rejects %j', (email) => {
    expect(parseEmail(email)).toBeNull();
  });
});

describe('emailSchema', () => {
  function messagesOf(raw: string): string[] | undefined {
    return emailSchema.safeParse(raw).error?.issues.map((issue) => issue.message);
  }

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
