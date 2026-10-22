import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { toast } from './toast-manager';

describe('toast.serverError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the curated message under the given title as an error toast, carrying the problem', () => {
    const add = vi.spyOn(toast, 'add').mockReturnValue('id');
    const problem: ApiProblem = {
      status: 404,
      code: 'Tag.NotFound',
      title: 'Etiqueta não achada.',
    };

    toast.serverError('Não foi possível abrir a etiqueta', problem);

    expect(add).toHaveBeenCalledExactlyOnceWith({
      title: 'Não foi possível abrir a etiqueta',
      description: 'Etiqueta não achada.',
      data: { problem },
      type: 'error',
    });
  });

  it('uses the problem title as the description, which is the message for an application error', () => {
    const add = vi.spyOn(toast, 'add').mockReturnValue('id');
    const problem: ApiProblem = {
      status: 409,
      code: 'Tag.DuplicateName',
      title: 'Já existe uma etiqueta com esse nome.',
      errors: {
        '': [{ code: 'Tag.DuplicateName', message: 'Já existe uma etiqueta com esse nome.' }],
      },
    };

    toast.serverError('Não foi possível salvar', problem);

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Já existe uma etiqueta com esse nome.' }),
    );
  });
});
