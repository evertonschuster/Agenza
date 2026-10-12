import { describe, expect, it } from 'vitest';
import { formatCpf, isValidCpf, stripCpfMask } from './cpf';

describe('isValidCpf', () => {
  it.each([
    '529.982.247-25',
    '52998224725',
    ' 529.982.247-25 ',
    '123.456.789-09',
    '111.444.777-35',
  ])('accepts %s', (cpf) => {
    expect(isValidCpf(cpf)).toBe(true);
  });

  it.each([
    '',
    '529.982.247-24',
    '529.982.247-52',
    '123.456.789-00',
    '5299822472',
    '529982247255',
    '000.000.000-00',
    '111.111.111-11',
    '999.999.999-99',
    'abc.def.ghi-jk',
    '529.982.247-2a',
  ])('rejects %j', (cpf) => {
    expect(isValidCpf(cpf)).toBe(false);
  });
});

describe('stripCpfMask', () => {
  it('removes dots, hyphens and spaces only', () => {
    expect(stripCpfMask(' 529.982.247-25 ')).toBe('52998224725');
    expect(stripCpfMask('529 982 247 25')).toBe('52998224725');
  });
});

describe('formatCpf', () => {
  it.each([
    ['', ''],
    ['5', '5'],
    ['529', '529'],
    ['5299', '529.9'],
    ['529982', '529.982'],
    ['5299822', '529.982.2'],
    ['529982247', '529.982.247'],
    ['5299822472', '529.982.247-2'],
    ['52998224725', '529.982.247-25'],
    ['529982247259999', '529.982.247-25'],
    ['529.982.247-25', '529.982.247-25'],
    ['abc529x', '529'],
  ] as const)('formats %j as %j while typing', (typed, expected) => {
    expect(formatCpf(typed)).toBe(expected);
  });
});
