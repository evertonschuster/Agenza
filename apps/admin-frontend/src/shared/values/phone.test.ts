import { describe, expect, it } from 'vitest';
import { PHONE_MAX_LENGTH, parsePhone, phoneSchema } from './phone';

describe('parsePhone', () => {
  it.each([
    ['11999990000', '11999990000'],
    ['(11) 99999-0000', '(11) 99999-0000'],
    ['+55 (11) 99999-0000', '+55 (11) 99999-0000'],
    ['11 9999-0000', '11 9999-0000'],
    ['+55 11 99999 0000', '+55 11 99999 0000'],
    ['1'.repeat(PHONE_MAX_LENGTH), '1'.repeat(PHONE_MAX_LENGTH)],
  ] as const)('accepts %j', (phone, expected) => {
    expect(parsePhone(phone)).toBe(expected);
  });

  it('trims before measuring, so padding never counts against the limit', () => {
    const padded = `  ${'1'.repeat(PHONE_MAX_LENGTH)}  `;

    expect(parsePhone(padded)).toBe('1'.repeat(PHONE_MAX_LENGTH));
    expect(parsePhone('  (11) 99999-0000  ')).toBe('(11) 99999-0000');
  });

  it.each([
    '',
    '   ',
    '1'.repeat(PHONE_MAX_LENGTH + 1),
    '(11) 99999-0000 ramal 12',
    '11.99999.0000',
    '11/99999',
    'telefone',
    '+-() ',
    '---',
  ])('rejects %j', (phone) => {
    expect(parsePhone(phone)).toBeNull();
  });
});

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
