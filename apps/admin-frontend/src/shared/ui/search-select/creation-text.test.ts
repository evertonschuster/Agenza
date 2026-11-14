import { describe, expect, it } from 'vitest';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { creationTextOf } from './creation-text';
import type { CreationTextArgs, SearchPhase } from './search-select.types';

const READY: SearchPhase = { kind: 'ready' };
const PROBLEM: ApiProblem = { status: 500, code: 'Server', title: 'O servidor falhou.' };
const VIP = { id: 't1', name: 'VIP' };
const CONVENIO = { id: 't2', name: 'Convênio' };

function argsOf(overrides: Partial<CreationTextArgs>): CreationTextArgs {
  return { text: '', searched: '', phase: READY, items: [], ...overrides };
}

describe('creationTextOf', () => {
  it('passes no text when nothing is typed', () => {
    expect(creationTextOf(argsOf({ text: '   ', searched: '' }))).toBe('');
  });

  it('passes the trimmed text when the shown results have no item with that name', () => {
    const args = argsOf({ text: '  Pós-operatório ', searched: 'Pós-operatório', items: [VIP] });
    expect(creationTextOf(args)).toBe('Pós-operatório');
  });

  it('passes no text when a shown item has the same name in another case or accent', () => {
    expect(creationTextOf(argsOf({ text: 'vip', searched: 'vip', items: [VIP] }))).toBe('');
    expect(
      creationTextOf(argsOf({ text: 'CONVENIO', searched: 'CONVENIO', items: [CONVENIO] })),
    ).toBe('');
  });

  it('keeps the text for a name that only starts like a shown item', () => {
    expect(creationTextOf(argsOf({ text: 'VI', searched: 'VI', items: [VIP] }))).toBe('VI');
  });

  it('passes the text while the shown results are from an older search', () => {
    expect(creationTextOf(argsOf({ text: 'vip', searched: 'vi', items: [VIP] }))).toBe('vip');
  });

  it('passes the text while the first page loads or after it fails', () => {
    const loading = argsOf({ text: 'vip', searched: 'vip', phase: { kind: 'loadingFirst' } });
    const failed = argsOf({
      text: 'vip',
      searched: 'vip',
      items: [VIP],
      phase: { kind: 'failed', problem: PROBLEM, retry: { search: 'vip', page: 1, pageSize: 20 } },
    });
    expect(creationTextOf(loading)).toBe('vip');
    expect(creationTextOf(failed)).toBe('vip');
  });

  it('still compares the loaded items while the next page loads', () => {
    const args = argsOf({
      text: 'VIP',
      searched: 'VIP',
      items: [VIP],
      phase: { kind: 'loadingNext' },
    });
    expect(creationTextOf(args)).toBe('');
  });
});
