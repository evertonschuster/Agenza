import { describe, expect, it } from 'vitest';
import { EMAIL_MAX_LENGTH, parseEmail } from './email';

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
