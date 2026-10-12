import { describe, expect, it } from 'vitest';
import { optionalValue } from './optionalValue';

const evenNumber = optionalValue((raw, fail) => {
  const value = Number(raw);
  return value % 2 === 0 ? value : fail('Informe um número par.');
});

describe('optionalValue', () => {
  it.each(['', '   '])('turns %j into null without calling the parser', (raw) => {
    expect(evenNumber.parse(raw)).toBeNull();
  });

  it('returns what the parser returns', () => {
    expect(evenNumber.parse('4')).toBe(4);
  });

  it('reports the parser failure as an issue carrying its message', () => {
    const result = evenNumber.safeParse('3');

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(['Informe um número par.']);
  });
});
