import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/shared/result';
import type { ApiProblem } from './servicesFacade';
import { NETWORK_PROBLEM, SERVER_PROBLEM, settle } from './settle';

const PROBLEM = { status: 404, code: 'Category.NotFound', title: 'não encontrada' };
const failWith = (error: unknown) => fail(error as ApiProblem);

describe('settle', () => {
  it('passes a success result straight through', async () => {
    const result = ok([1, 2]);
    expect(await settle(Promise.resolve(result))).toBe(result);
  });

  it('passes a renderable Problem failure straight through', async () => {
    const result = fail(PROBLEM);
    expect(await settle(Promise.resolve(result))).toBe(result);
  });

  it('turns a transport rejection into NETWORK_PROBLEM', async () => {
    expect(await settle(Promise.reject(new TypeError('Failed to fetch')))).toEqual(
      fail(NETWORK_PROBLEM),
    );
  });

  it('turns a non-2xx with no readable problem body into SERVER_PROBLEM', async () => {
    expect(await settle(Promise.resolve(failWith('<html>502 Bad Gateway</html>')))).toEqual(
      fail(SERVER_PROBLEM),
    );
    expect(await settle(Promise.resolve(failWith(undefined)))).toEqual(fail(SERVER_PROBLEM));
    expect(await settle(Promise.resolve(failWith({})))).toEqual(fail(SERVER_PROBLEM));
  });
});
