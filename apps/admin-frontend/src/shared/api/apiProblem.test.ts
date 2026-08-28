import { describe, expect, it } from 'vitest';
import { NETWORK_PROBLEM, asProblem } from './apiProblem';

describe('asProblem', () => {
  it('passes a Problem Details body straight through', () => {
    const body = {
      type: 'https://agenza/errors/application',
      title: "Já existe uma categoria chamada 'Everton'.",
      status: 409,
      code: 'Category.DuplicateName',
      errors: { '': [{ code: 'Category.DuplicateName', message: 'Já existe…' }] },
    };

    expect(asProblem(409, body)).toBe(body);
  });

  it.each([
    ['a string body (proxy HTML)', '<html>502 Bad Gateway</html>'],
    ['an empty body', undefined],
    ['an array body', [1, 2, 3]],
    ['a null body', null],
    ['an object without a title', { message: 'Bad Gateway' }],
  ])('synthesizes a problem for %s', (_label, body) => {
    const problem = asProblem(502, body);
    expect(problem.status).toBe(502);
    expect(problem.code).toBe('Http.Unexpected');
    expect(typeof problem.title).toBe('string');
  });

  it('NETWORK_PROBLEM is a well-formed offline problem', () => {
    expect(NETWORK_PROBLEM.code).toBe('Network.Unreachable');
    expect(NETWORK_PROBLEM.status).toBe(0);
  });
});
