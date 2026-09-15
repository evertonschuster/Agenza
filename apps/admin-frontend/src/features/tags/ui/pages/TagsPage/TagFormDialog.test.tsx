import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagFormDialog } from './TagFormDialog';
import { toast } from '@/shared/ui/toast';
import type { Tag } from '../../../model/tag';
import type { ApiProblem } from '@/shared/api/servicesFacade';

const { mockCreate, mockUpdate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { create: mockCreate, update: mockUpdate, list: vi.fn(), remove: vi.fn() },
}));

const EXISTING_TAG: Tag = {
  id: 'tag-1',
  name: 'VIP',
  color: '#8b5cf6',
  description: 'Clientes premium',
};

function renderDialog({ tag = null }: { tag?: Tag | null } = {}) {
  const onOpenChange = vi.fn();
  const onSaved = vi.fn();
  render(<TagFormDialog tag={tag} onOpenChange={onOpenChange} onSaved={onSaved} />);
  return { onOpenChange, onSaved };
}

describe('TagFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks submission and shows the exact backend-style message when the name is empty (spec FR-005)', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('O nome da etiqueta é obrigatório.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('blocks submission when no color is selected (spec FR-003)', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText('Nome'), 'Promoção');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('A cor da etiqueta é obrigatória.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates a tag with valid input, shows a success toast, and closes the dialog (spec US2)', async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({
      ok: true,
      data: { id: 'new-id', name: 'Promoção', color: '#f59e0b', description: null },
    });
    const toastAddSpy = vi.spyOn(toast, 'add');
    const { onOpenChange, onSaved } = renderDialog();

    await user.type(screen.getByLabelText('Nome'), 'Promoção');
    await user.click(screen.getByRole('radio', { name: 'Âmbar' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(toastAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Etiqueta criada',
        description: '"Promoção" foi adicionada ao catálogo.',
        type: 'success',
      }),
    );
  });

  it('edits a tag, shows a success toast worded for an update, and closes the dialog (spec US3)', async () => {
    const user = userEvent.setup();
    mockUpdate.mockResolvedValue({ ok: true, data: EXISTING_TAG });
    const toastAddSpy = vi.spyOn(toast, 'add');
    const { onOpenChange } = renderDialog({ tag: EXISTING_TAG });

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(mockUpdate).toHaveBeenCalledWith('tag-1', {
      name: 'VIP',
      color: '#8b5cf6',
      description: 'Clientes premium',
    });
    expect(toastAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Etiqueta atualizada',
        description: '"VIP" foi atualizada.',
        type: 'success',
      }),
    );
  });

  it('shows the exact backend conflict message and keeps the dialog open on a duplicate name (spec FR-004, FR-012)', async () => {
    const user = userEvent.setup();
    const conflict: ApiProblem = {
      type: 'https://agenza/errors/application',
      title: "Já existe uma etiqueta chamada 'VIP'.",
      status: 409,
      code: 'Tag.DuplicateName',
      errors: {
        '': [{ code: 'Tag.DuplicateName', message: "Já existe uma etiqueta chamada 'VIP'." }],
      },
    };
    mockCreate.mockResolvedValue({ ok: false, error: conflict });
    const { onOpenChange } = renderDialog();

    await user.type(screen.getByLabelText('Nome'), 'VIP');
    await user.click(screen.getByRole('radio', { name: 'Violeta' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText("Já existe uma etiqueta chamada 'VIP'.")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('shows the not-found message without crashing when the tag was removed by someone else (edge case, spec FR-012)', async () => {
    const user = userEvent.setup();
    const notFound: ApiProblem = {
      type: 'https://agenza/errors/application',
      title: "Etiqueta 'tag-1' não foi encontrada.",
      status: 404,
      code: 'Tag.NotFound',
      errors: { '': [{ code: 'Tag.NotFound', message: "Etiqueta 'tag-1' não foi encontrada." }] },
    };
    mockUpdate.mockResolvedValue({ ok: false, error: notFound });
    renderDialog({ tag: EXISTING_TAG });

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText("Etiqueta 'tag-1' não foi encontrada.")).toBeInTheDocument();
  });

  it('keeps the typed values on screen when the connection fails (edge case)', async () => {
    const user = userEvent.setup();
    const networkProblem: ApiProblem = {
      status: 0,
      code: 'Network.Unreachable',
      title: 'Sem conexão com o servidor. Tente novamente.',
    };
    mockCreate.mockResolvedValue({ ok: false, error: networkProblem });
    renderDialog();

    await user.type(screen.getByLabelText('Nome'), 'Promoção');
    await user.click(screen.getByRole('radio', { name: 'Âmbar' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Sem conexão com o servidor. Tente novamente.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Promoção');
  });

  it('pre-fills the fields when editing an existing tag (spec US3)', () => {
    renderDialog({ tag: EXISTING_TAG });

    expect(screen.getByRole('heading', { name: 'Editar etiqueta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('VIP');
    expect(screen.getByRole('radio', { name: 'Violeta' })).toBeChecked();
  });

  it('blocks a rename that collides with another tag, without saving (spec FR-006)', async () => {
    const user = userEvent.setup();
    const conflict: ApiProblem = {
      type: 'https://agenza/errors/application',
      title: "Já existe uma etiqueta chamada 'Promoção'.",
      status: 409,
      code: 'Tag.DuplicateName',
      errors: {
        '': [{ code: 'Tag.DuplicateName', message: "Já existe uma etiqueta chamada 'Promoção'." }],
      },
    };
    mockUpdate.mockResolvedValue({ ok: false, error: conflict });
    const { onOpenChange } = renderDialog({ tag: EXISTING_TAG });

    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Promoção');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText("Já existe uma etiqueta chamada 'Promoção'."),
    ).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
