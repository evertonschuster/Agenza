import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as toastModule from '@/shared/ui/toast';
import { TAG_NAME_MAX_LENGTH, type Tag } from '../../../model/tag';
import { TAG_COLOR_PALETTE } from '../../../model/tagColor';
import { tagSaved } from '../../../model/tagEvents';
import { TagCreationDialog } from './TagCreationDialog';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('../../../api/tagsRepository', () => ({
  tagsRepository: { create: mockCreate },
}));

const CREATED: Tag = { id: '9', name: 'Pós-operatório', color: '#0ea5e9', description: null };

function renderDialog(name = 'Pós-operatório') {
  const onCreated = vi.fn();
  const onCancel = vi.fn();
  render(<TagCreationDialog name={name} onCreated={onCreated} onCancel={onCancel} />);
  return { onCreated, onCancel };
}

describe('TagCreationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ ok: true, data: CREATED });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens titled "Nova etiqueta" with the received name and no color checked, like the Etiquetas page', async () => {
    renderDialog('Pós-operatório');

    expect(await screen.findByRole('heading', { name: 'Nova etiqueta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Pós-operatório');
    expect(screen.getByLabelText('Descrição')).toHaveValue('');
    for (const option of TAG_COLOR_PALETTE) {
      expect(screen.getByRole('radio', { name: option.label })).not.toBeChecked();
    }
  });

  it('opens with the received name cut to the name limit', async () => {
    renderDialog('x'.repeat(TAG_NAME_MAX_LENGTH + 20));

    expect(await screen.findByLabelText('Nome')).toHaveValue('x'.repeat(TAG_NAME_MAX_LENGTH));
  });

  it('opens without a name when it receives none', async () => {
    renderDialog('');

    expect(await screen.findByLabelText('Nome')).toHaveValue('');
  });

  it('keeps the chosen color while the name is typed', async () => {
    const user = userEvent.setup();
    renderDialog('');
    const nameInput = await screen.findByLabelText('Nome');

    await user.click(screen.getByRole('radio', { name: 'Rosa' }));
    await user.type(nameInput, 'Pós-operatório');

    expect(screen.getByRole('radio', { name: 'Rosa' })).toBeChecked();
  });

  it('asks for a color before creating', async () => {
    const user = userEvent.setup();
    const { onCreated } = renderDialog('Pós-operatório');
    await screen.findByLabelText('Nome');

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('A cor da etiqueta é obrigatória.')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('creates the tag with the form values, announces it and hands it back', async () => {
    const user = userEvent.setup();
    const addToast = vi.spyOn(toastModule.toast, 'add');
    const saved = vi.fn();
    onTestFinished(tagSaved.subscribe(saved));
    const { onCreated, onCancel } = renderDialog('Pós-operatório');
    await screen.findByLabelText('Nome');

    await user.click(screen.getByRole('radio', { name: 'Azul' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(CREATED));
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Pós-operatório',
      color: '#0ea5e9',
      description: null,
    });
    expect(saved).toHaveBeenCalledWith({ id: '9' });
    expect(addToast).toHaveBeenCalledWith({
      title: 'Etiqueta criada',
      description: '"Pós-operatório" foi criada e selecionada.',
      type: 'success',
    });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('offers no way out while saving and hands the tag back when the save ends', async () => {
    const user = userEvent.setup();
    let answer: (result: { ok: true; data: Tag }) => void = () => undefined;
    mockCreate.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const { onCreated, onCancel } = renderDialog('Pós-operatório');
    await screen.findByLabelText('Nome');
    await user.click(screen.getByRole('radio', { name: 'Azul' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));

    await user.keyboard('{Escape}');

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    await act(async () => {
      answer({ ok: true, data: CREATED });
      await Promise.resolve();
    });
    expect(onCreated).toHaveBeenCalledWith(CREATED);
  });

  it('shows a duplicate name tied to the name field under it', async () => {
    const user = userEvent.setup();
    const message = "Já existe uma etiqueta chamada 'Pós-operatório'.";
    mockCreate.mockResolvedValue({
      ok: false,
      error: {
        status: 409,
        code: 'Tag.DuplicateName',
        title: message,
        errors: { Name: [{ code: 'Tag.DuplicateName', message }] },
      },
    });
    const { onCreated } = renderDialog('Pós-operatório');
    await screen.findByLabelText('Nome');

    await user.click(screen.getByRole('radio', { name: 'Azul' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Nome')).toHaveValue('Pós-operatório');
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('shows a duplicate name without a field in the form banner', async () => {
    const user = userEvent.setup();
    const message = "Já existe uma etiqueta chamada 'VIP'.";
    mockCreate.mockResolvedValue({
      ok: false,
      error: {
        status: 409,
        code: 'Tag.DuplicateName',
        title: message,
        errors: { '': [{ code: 'Tag.DuplicateName', message }] },
      },
    });
    renderDialog('VIP');
    await screen.findByLabelText('Nome');

    await user.click(screen.getByRole('radio', { name: 'Azul' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('heading', { name: 'Nova etiqueta' })).toBeInTheDocument();
  });

  it('cancels from the Cancelar button', async () => {
    const user = userEvent.setup();
    const { onCancel, onCreated } = renderDialog();
    await screen.findByLabelText('Nome');

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('cancels with Escape', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog();
    await screen.findByLabelText('Nome');

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('keeps the created tag published but touches nothing on screen once the dialog is gone', async () => {
    const user = userEvent.setup();
    const addToast = vi.spyOn(toastModule.toast, 'add');
    const saved = vi.fn();
    onTestFinished(tagSaved.subscribe(saved));
    let answer: (result: { ok: true; data: Tag }) => void = () => undefined;
    mockCreate.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const onCreated = vi.fn();
    const { unmount } = render(
      <TagCreationDialog name="Pós-operatório" onCreated={onCreated} onCancel={vi.fn()} />,
    );
    await screen.findByLabelText('Nome');
    await user.click(screen.getByRole('radio', { name: 'Azul' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));

    unmount();
    await act(async () => {
      answer({ ok: true, data: CREATED });
      await Promise.resolve();
    });

    expect(saved).toHaveBeenCalledWith({ id: '9' });
    expect(onCreated).not.toHaveBeenCalled();
    expect(addToast).not.toHaveBeenCalled();
  });
});
