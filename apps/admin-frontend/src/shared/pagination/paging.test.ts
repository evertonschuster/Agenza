import { describe, expect, it } from 'vitest';
import { getLastPage } from './paging';

describe('getLastPage', () => {
  it.each([
    [0, 20, 1],
    [1, 20, 1],
    [20, 20, 1],
    [21, 20, 2],
    [87, 20, 5],
    [100, 100, 1],
    [101, 100, 2],
  ])('has %i items at %i per page ending on page %i', (totalCount, pageSize, expected) => {
    expect(getLastPage(totalCount, pageSize)).toBe(expected);
  });
});
