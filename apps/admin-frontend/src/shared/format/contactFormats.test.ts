import { describe, expect, it } from 'vitest';
import { isValidEmail, isValidPhone } from './contactFormats';

describe('isValidPhone', () => {
  it.each([
    '11999990000',
    '(11) 99999-0000',
    '+55 (11) 99999-0000',
    '11 9999-0000',
    '1'.repeat(20),
  ])('accepts %j', (phone) => {
    expect(isValidPhone(phone)).toBe(true);
  });

  it.each([
    '',
    '1'.repeat(21),
    '(11) 99999-0000 ramal 12',
    '11.99999.0000',
    '11/99999',
    'telefone',
    '+-() ',
    '---',
  ])('rejects %j', (phone) => {
    expect(isValidPhone(phone)).toBe(false);
  });
});

describe('isValidEmail', () => {
  it.each(['maria@example.com', 'maria.souza+agenda@mail.example.com.br', 'a@b.co'])(
    'accepts %j',
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    },
  );

  it.each([
    '',
    'maria',
    'maria@',
    '@example.com',
    'maria@example',
    'maria@@example.com',
    'maria@example..com',
    'maria@.example.com',
    'maria@example.com.',
    'maria souza@example.com',
    `${'a'.repeat(250)}@example.com`,
  ])('rejects %j', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});
