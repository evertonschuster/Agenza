import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  getLastPage,
  getPageWindow,
  getVisibleRange,
  readPaging,
  withPaging,
} from './paging';

describe('readPaging', () => {
  it('starts on the first page with the default size when the URL says nothing', () => {
    expect(readPaging(new URLSearchParams())).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });

  it('reads the page and the size from ?page= and ?pageSize=', () => {
    expect(readPaging(new URLSearchParams('page=3&pageSize=50'))).toEqual({
      page: 3,
      pageSize: 50,
    });
  });

  it.each(['abc', '0', '-2', '1.5', '', '01', ' 2', '2 ', '0x10', '1e3'])(
    'falls back to the first page for the invalid page %j',
    (page) => {
      expect(readPaging(new URLSearchParams({ page })).page).toBe(1);
    },
  );

  it.each(['abc', '0', '30', '500', '', '020', '10.0', '-10'])(
    'falls back to the default size for %j, which is not one of the offered sizes',
    (pageSize) => {
      expect(readPaging(new URLSearchParams({ pageSize })).pageSize).toBe(DEFAULT_PAGE_SIZE);
    },
  );

  it.each(PAGE_SIZE_OPTIONS)('accepts the offered size %i', (pageSize) => {
    expect(readPaging(new URLSearchParams({ pageSize: String(pageSize) })).pageSize).toBe(pageSize);
  });

  it('refuses a page whose offset would not fit the int the backend counts in', () => {
    expect(readPaging(new URLSearchParams('page=21474837&pageSize=100')).page).toBe(21474837);
    expect(readPaging(new URLSearchParams('page=21474838&pageSize=100')).page).toBe(1);
    expect(readPaging(new URLSearchParams('page=99999999999999999999')).page).toBe(1);
  });

  it('judges the page against the size that is actually used, so an invalid size does not shrink the limit', () => {
    expect(readPaging(new URLSearchParams('page=21474838&pageSize=30'))).toEqual({
      page: 21474838,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });
});

describe('withPaging', () => {
  it('leaves the URL clean when the paging is the default', () => {
    const next = withPaging(new URLSearchParams('page=4&pageSize=50'), {
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });

    expect(next.toString()).toBe('');
  });

  it('writes a page other than the first and a size other than the default', () => {
    const next = withPaging(new URLSearchParams(), { page: 3, pageSize: 50 });

    expect(next.toString()).toBe('page=3&pageSize=50');
  });

  it('keeps every other parameter, in its place', () => {
    const next = withPaging(new URLSearchParams('q=ana&status=active'), { page: 2, pageSize: 10 });

    expect(next.toString()).toBe('q=ana&status=active&page=2&pageSize=10');
  });

  it('replaces a page and a size already in the URL', () => {
    const next = withPaging(new URLSearchParams('page=2&q=ana&pageSize=10'), {
      page: 5,
      pageSize: 100,
    });

    expect(next.toString()).toBe('page=5&q=ana&pageSize=100');
  });

  it('does not change the parameters it was given', () => {
    const params = new URLSearchParams('page=2');

    withPaging(params, { page: 3, pageSize: 50 });

    expect(params.toString()).toBe('page=2');
  });
});

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
