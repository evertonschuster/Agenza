import { describe, expect, it } from 'vitest';
import { withFilters, type ListFilterValue } from './filters';

function write(search: string, filters: Record<string, ListFilterValue>): string {
  return withFilters(new URLSearchParams(search), filters).toString();
}

describe('withFilters', () => {
  it('puts a text in the URL under the name of its filter', () => {
    expect(write('', { q: 'ana' })).toBe('q=ana');
  });

  it('leaves an empty text, a null, a false and an empty list out of the URL', () => {
    expect(
      write('q=ana&status=active&pending=1&tag=a', {
        q: '',
        status: null,
        pending: false,
        tag: [],
      }),
    ).toBe('');
  });

  it('writes a true flag as 1', () => {
    expect(write('', { pending: true })).toBe('pending=1');
  });

  it('repeats the name for each value of a list', () => {
    expect(write('', { tag: ['a', 'b'] })).toBe('tag=a&tag=b');
  });

  it('keeps every parameter that is not one of its filters, such as the paging', () => {
    expect(write('page=3&pageSize=50', { q: 'ana' })).toBe('page=3&pageSize=50&q=ana');
  });

  it('changes a text where it already is, so the order of the URL does not move', () => {
    expect(write('q=ana&page=3', { q: 'bruno' })).toBe('q=bruno&page=3');
  });

  it('keeps a single value when the URL repeats a text', () => {
    expect(write('q=ana&q=bruno', { q: 'ana' })).toBe('q=ana');
  });

  it('leaves a list where it is when it already holds the same values', () => {
    expect(write('tag=a&page=2&tag=b', { tag: ['a', 'b'] })).toBe('tag=a&page=2&tag=b');
  });

  it('rewrites a list whose values changed', () => {
    expect(write('tag=a&page=2&tag=b', { tag: ['b'] })).toBe('page=2&tag=b');
  });

  it('does not change the parameters it was given', () => {
    const params = new URLSearchParams('q=ana');

    withFilters(params, { q: '' });

    expect(params.toString()).toBe('q=ana');
  });
});
