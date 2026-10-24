import { describe, expect, it } from 'vitest';
import { utcDate } from '@/shared/format/date';
import {
  dateLayoutOf,
  datePlaceholder,
  formatMaskedDate,
  maskDate,
  parseMaskedDate,
} from './masked-date';

const PT_BR = dateLayoutOf('pt-BR');
const EN_US = dateLayoutOf('en-US');
const DE = dateLayoutOf('de-DE');
const SV = dateLayoutOf('sv-SE');

describe('dateLayoutOf', () => {
  it.each([
    ['pt-BR', ['day', 'month', 'year'], '/'],
    ['en-US', ['month', 'day', 'year'], '/'],
    ['de-DE', ['day', 'month', 'year'], '.'],
    ['sv-SE', ['year', 'month', 'day'], '-'],
  ] as const)('reads the order and separator of %s from Intl', (locale, order, separator) => {
    expect(dateLayoutOf(locale)).toMatchObject({ order, separator });
  });

  it.each([
    [PT_BR, 'dd/mm/aaaa'],
    [EN_US, 'mm/dd/aaaa'],
    [DE, 'dd.mm.aaaa'],
    [SV, 'aaaa-mm-dd'],
  ] as const)('gives the placeholder %#: %j', (layout, expected) => {
    expect(datePlaceholder(layout)).toBe(expected);
  });
});

describe('maskDate', () => {
  it.each([
    ['', ''],
    ['1', '1'],
    ['10', '10'],
    ['103', '10/3'],
    ['1003', '10/03'],
    ['10032', '10/03/2'],
    ['10032015', '10/03/2015'],
    ['100320159999', '10/03/2015'],
    ['10/03/2015', '10/03/2015'],
    ['ab10-03', '10/03'],
  ] as const)('masks %j as %j while typing in pt-BR', (typed, expected) => {
    expect(maskDate(typed, PT_BR)).toBe(expected);
  });

  it.each([
    [EN_US, '03102015', '03/10/2015'],
    [DE, '1003', '10.03'],
    [SV, '2015031', '2015-03-1'],
    [SV, '20150310', '2015-03-10'],
  ] as const)(
    'follows the order and separator of another language: %#',
    (layout, typed, expected) => {
      expect(maskDate(typed, layout)).toBe(expected);
    },
  );
});

describe('parseMaskedDate', () => {
  it.each([
    ['10/03/2015', utcDate(2015, 3, 10)],
    ['01/01/1900', utcDate(1900, 1, 1)],
    ['29/02/2000', utcDate(2000, 2, 29)],
    ['05/12/1990', utcDate(1990, 12, 5)],
  ] as const)('reads %j as %s in pt-BR', (masked, expected) => {
    expect(parseMaskedDate(masked, PT_BR)).toEqual(expected);
  });

  it.each([
    '',
    '10/03',
    '10/03/15',
    '31/02/2020',
    '29/02/2001',
    '00/10/2020',
    '10/00/2020',
    '10/13/2020',
    '32/01/2020',
    '10/03/0999',
    'aa/bb/cccc',
    '10-03-2015',
    '1 /03/2015',
    '10/03/2015/',
  ])('rejects %j in pt-BR', (masked) => {
    expect(parseMaskedDate(masked, PT_BR)).toBeNull();
  });

  it.each([
    [EN_US, '03/10/2015'],
    [DE, '10.03.2015'],
    [SV, '2015-03-10'],
  ] as const)('reads the day in the order of another language: %#', (layout, masked) => {
    expect(parseMaskedDate(masked, layout)).toEqual(utcDate(2015, 3, 10));
  });

  it('rejects the pt-BR order where the language puts the month first', () => {
    expect(parseMaskedDate('25/12/2015', EN_US)).toBeNull();
  });
});

describe('formatMaskedDate', () => {
  it('writes the UTC calendar day in the language order, whatever the zone of the device', () => {
    expect(formatMaskedDate(new Date('2015-03-10T00:00:00Z'), PT_BR)).toBe('10/03/2015');
    expect(formatMaskedDate(new Date('2015-03-10T23:59:59Z'), PT_BR)).toBe('10/03/2015');
    expect(formatMaskedDate(utcDate(1900, 1, 1), PT_BR)).toBe('01/01/1900');
    expect(formatMaskedDate(utcDate(2015, 3, 10), EN_US)).toBe('03/10/2015');
    expect(formatMaskedDate(utcDate(2015, 3, 10), SV)).toBe('2015-03-10');
  });

  it.each([PT_BR, EN_US, DE, SV])('round-trips with parseMaskedDate: %#', (layout) => {
    expect(parseMaskedDate(formatMaskedDate(utcDate(2000, 2, 29), layout), layout)).toEqual(
      utcDate(2000, 2, 29),
    );
  });
});
