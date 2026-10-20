import { describe, expect, it } from 'vitest';
import { formatCount, formatNumber } from './count';

const PERSON = { singular: 'pessoa', plural: 'pessoas' };

describe('formatNumber', () => {
  it.each([
    [7, '7'],
    [1234, '1.234'],
    [1234567, '1.234.567'],
  ] as const)('writes %i as %j', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });
});

describe('formatCount', () => {
  it.each([
    [1, '1 pessoa'],
    [2, '2 pessoas'],
    [87, '87 pessoas'],
    [1234, '1.234 pessoas'],
  ] as const)('writes %i people as %j', (count, expected) => {
    expect(formatCount(count, PERSON)).toBe(expected);
  });
});
