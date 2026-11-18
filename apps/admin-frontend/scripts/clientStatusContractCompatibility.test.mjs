import { describe, expect, it } from 'vitest';
import { matchesClientStatusContract } from './clientStatusContractCompatibility.mjs';

const current = `export interface paths {
  '/api/v{version}/clients': {
    parameters: {
      query?: never;
    };
    get: {
      parameters: {
        query?: {
          Status?: 'Active' | 'Inactive' | 'All';
          Page?: number;
        };
      };
    };
  };
}
export interface components {
  schemas: {
    /** @enum {unknown} */
    ClientStatus: 'active' | 'inactive';
  };
}
`;
const legacy = current
  .replace("'Active' | 'Inactive' | 'All'", "components['schemas']['ClientStatusFilter']")
  .replace(
    "    ClientStatus: 'active' | 'inactive';",
    "    ClientStatus: 'active' | 'inactive';\n    /** @enum {unknown} */\n    ClientStatusFilter: 'active' | 'inactive' | 'all' | null;",
  );

describe('checagem de contrato do filtro Status', () => {
  it('aceita a representação equivalente do filtro opcional', () => {
    expect(matchesClientStatusContract(legacy, current)).toBe(true);
  });

  it.each([
    ['o filtro fica obrigatório', 'Status?:', 'Status:'],
    ['um valor é removido', " | 'All'", ''],
    ['um valor é adicionado', " | 'All'", " | 'All' | 'Pending'"],
    ['outra query muda', 'Page?: number', 'Page?: string'],
    ['a resposta muda', "ClientStatus: 'active'", "ClientStatus: 'Active'"],
  ])('rejeita a divergência quando %s', (_, before, after) => {
    expect(matchesClientStatusContract(legacy, current.replace(before, after))).toBe(false);
  });

  it('mantém a comparação exata para outro endpoint', () => {
    const otherPath = (source) => source.replace('/clients', '/tags');
    expect(matchesClientStatusContract(otherPath(legacy), otherPath(current))).toBe(false);
  });

  it('mantém uma definição legada usada por outro campo', () => {
    const extraReference = legacy.replace(
      'Page?: number',
      "Page?: components['schemas']['ClientStatusFilter']",
    );
    expect(matchesClientStatusContract(extraReference, current)).toBe(false);
  });
});
