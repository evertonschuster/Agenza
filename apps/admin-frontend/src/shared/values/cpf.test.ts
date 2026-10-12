import { describe, expect, it } from 'vitest';
import { cpfSchema, maskCpf, parseCpf } from './cpf';

describe('parseCpf', () => {
  it.each([
    ['529.982.247-25', '52998224725'],
    ['52998224725', '52998224725'],
    [' 529.982.247-25 ', '52998224725'],
    ['529 982 247 25', '52998224725'],
    ['123.456.789-09', '12345678909'],
    ['111.444.777-35', '11144477735'],
  ] as const)('reads %j as the digits %j', (cpf, expected) => {
    expect(parseCpf(cpf)).toBe(expected);
  });

  it.each([
    '',
    '   ',
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
    expect(parseCpf(cpf)).toBeNull();
  });
});

describe('maskCpf', () => {
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
  ] as const)('masks %j as %j while typing', (typed, expected) => {
    expect(maskCpf(typed)).toBe(expected);
  });
});

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
