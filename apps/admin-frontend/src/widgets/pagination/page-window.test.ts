import { describe, expect, it } from 'vitest';
import { getPageWindow } from './page-window';

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
