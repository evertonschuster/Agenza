import { describe, expect, it } from 'vitest';
import { toClientStatus } from './clientStatus';

describe('toClientStatus', () => {
  it('reads the situation the backend writes as text', () => {
    expect(toClientStatus('active')).toBe('active');
    expect(toClientStatus('inactive')).toBe('inactive');
  });
});
