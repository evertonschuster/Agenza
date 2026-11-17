import { describe, expect, it } from 'vitest';
import { editClientPath } from './clientPaths';
import { editRecordPath } from './editRecordPath';

describe('editRecordPath', () => {
  it('builds the common edit route without altering the supplied ID', () => {
    expect(editClientPath('abc%2F123')).toBe('/pessoas/abc%2F123/editar');
    expect(editRecordPath('/servicos', 'abc%2F123')).toBe('/servicos/abc%2F123/editar');
    expect(editRecordPath('/servicos', '$&')).toBe('/servicos/$&/editar');
  });
});
