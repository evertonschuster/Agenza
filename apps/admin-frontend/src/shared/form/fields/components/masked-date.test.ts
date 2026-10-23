import { describe, expect, it } from 'vitest';
import { utcDate } from '@/shared/format/date';
import { formatMaskedDate, maskDate, parseMaskedDate } from './masked-date';

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
  ] as const)('masks %j as %j while typing', (typed, expected) => {
    expect(maskDate(typed)).toBe(expected);
  });
});

describe('parseMaskedDate', () => {
  it.each([
    ['10/03/2015', utcDate(2015, 3, 10)],
    ['01/01/1900', utcDate(1900, 1, 1)],
    ['29/02/2000', utcDate(2000, 2, 29)],
    [' 05/12/1990 ', utcDate(1990, 12, 5)],
  ] as const)('reads %j as %s', (masked, expected) => {
    expect(parseMaskedDate(masked)).toEqual(expected);
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
  ])('rejects %j', (masked) => {
    expect(parseMaskedDate(masked)).toBeNull();
  });
});

describe('formatMaskedDate', () => {
  it('writes the UTC calendar day as dd/mm/aaaa, whatever the zone of the device', () => {
    expect(formatMaskedDate(new Date('2015-03-10T00:00:00Z'))).toBe('10/03/2015');
    expect(formatMaskedDate(new Date('2015-03-10T23:59:59Z'))).toBe('10/03/2015');
    expect(formatMaskedDate(utcDate(1900, 1, 1))).toBe('01/01/1900');
  });

  it('round-trips with parseMaskedDate', () => {
    expect(parseMaskedDate(formatMaskedDate(utcDate(2000, 2, 29)))).toEqual(utcDate(2000, 2, 29));
  });
});
