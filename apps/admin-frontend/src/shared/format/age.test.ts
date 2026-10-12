import { describe, expect, it } from 'vitest';
import { formatAge } from './age';

describe('formatAge', () => {
  it.each([
    [0, 'menos de 1 ano'],
    [1, '1 ano'],
    [2, '2 anos'],
    [17, '17 anos'],
    [120, '120 anos'],
  ] as const)('writes %i as %j', (age, expected) => {
    expect(formatAge(age)).toBe(expected);
  });
});
