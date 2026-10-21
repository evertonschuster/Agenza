import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import { showProblemToast } from './show-problem-toast';
import { toast } from './toast-manager';

describe('showProblemToast', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the curated message and the code as an error toast under the given title', () => {
    const add = vi.spyOn(toast, 'add').mockReturnValue('id');
    const problem: ApiProblem = {
      status: 404,
      code: 'Tag.NotFound',
      title: 'Etiqueta não achada.',
    };

    showProblemToast('Não foi possível abrir a etiqueta', problem);

    expect(add).toHaveBeenCalledExactlyOnceWith({
      title: 'Não foi possível abrir a etiqueta',
      description: 'Etiqueta não achada.',
      data: { code: 'Tag.NotFound' },
      type: 'error',
    });
  });

  it('prefers the message under the empty key, as the other failure surfaces do', () => {
    const add = vi.spyOn(toast, 'add').mockReturnValue('id');
    const problem: ApiProblem = {
      status: 409,
      code: 'Tag.DuplicateName',
      title: 'Conflito.',
      errors: { '': [{ message: 'Já existe uma etiqueta com esse nome.' }] },
    };

    showProblemToast('Não foi possível salvar', problem);

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Já existe uma etiqueta com esse nome.' }),
    );
  });

  it('sends no code when the problem has none', () => {
    const add = vi.spyOn(toast, 'add').mockReturnValue('id');

    showProblemToast('Não foi possível abrir a etiqueta', { status: 400, title: 'Inválido.' });

    expect(add).toHaveBeenCalledWith(expect.objectContaining({ data: { code: undefined } }));
  });
});
