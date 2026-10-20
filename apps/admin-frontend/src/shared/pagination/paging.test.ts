import { describe, expect, it } from 'vitest';
import { getLastPage, getPageWindow, getVisibleRange } from './paging';

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

describe('getVisibleRange', () => {
  it('numbers the items of a page from one', () => {
    expect(getVisibleRange({ page: 2, pageSize: 20 }, 87)).toEqual({ first: 21, last: 40 });
  });

  it('stops at the total on the last, partial page', () => {
    expect(getVisibleRange({ page: 5, pageSize: 20 }, 87)).toEqual({ first: 81, last: 87 });
  });

  it('covers the whole list when it fits one page', () => {
    expect(getVisibleRange({ page: 1, pageSize: 20 }, 3)).toEqual({ first: 1, last: 3 });
  });
});

describe('getPageWindow', () => {
  it.each([
    [1, 1, [1]],
    [1, 7, [1, 2, 3, 4, 5, 6, 7]],
    [4, 7, [1, 2, 3, 4, 5, 6, 7]],
    [1, 8, [1, 2, 3, 4, 5, 'ellipsis', 8]],
    [4, 8, [1, 2, 3, 4, 5, 'ellipsis', 8]],
    [5, 8, [1, 'ellipsis', 4, 5, 6, 7, 8]],
    [8, 8, [1, 'ellipsis', 4, 5, 6, 7, 8]],
    [1, 22, [1, 2, 3, 4, 5, 'ellipsis', 22]],
    [4, 22, [1, 2, 3, 4, 5, 'ellipsis', 22]],
    [5, 22, [1, 'ellipsis', 4, 5, 6, 'ellipsis', 22]],
    [11, 22, [1, 'ellipsis', 10, 11, 12, 'ellipsis', 22]],
    [18, 22, [1, 'ellipsis', 17, 18, 19, 'ellipsis', 22]],
    [19, 22, [1, 'ellipsis', 18, 19, 20, 21, 22]],
    [22, 22, [1, 'ellipsis', 18, 19, 20, 21, 22]],
  ])('shows, on page %i of %i, %j', (page, lastPage, expected) => {
    expect(getPageWindow(page, lastPage)).toEqual(expected);
  });

  it('is never wider than seven slots, wherever the current page is', () => {
    for (let page = 1; page <= 40; page += 1) {
      expect(getPageWindow(page, 40).length).toBeLessThanOrEqual(7);
    }
  });

  it('always shows the first page, the last page and the current one', () => {
    for (let page = 1; page <= 40; page += 1) {
      const window = getPageWindow(page, 40);
      expect(window).toContain(1);
      expect(window).toContain(40);
      expect(window).toContain(page);
    }
  });
});
