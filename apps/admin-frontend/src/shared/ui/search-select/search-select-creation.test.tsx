import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApiProblem, ApiResult } from '@/shared/api/servicesFacade';
import type { PagedResult } from '@/shared/pagination/paging';
import { fail, ok } from '@/shared/result';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/shared/ui/dialog';
import {
  SearchSelect,
  type SearchItemsQuery,
  type SearchSelectCreation,
  type SearchSelectCreationRequest,
  type SearchSelectProps,
} from '.';

interface Tag {
  id: string;
  name: string;
}

type Answer = ApiResult<PagedResult<Tag>>;
type Loader = (query: SearchItemsQuery, signal: AbortSignal) => Promise<Answer>;

const VIP: Tag = { id: 't1', name: 'VIP' };
const RETORNO: Tag = { id: 't2', name: 'Retorno' };
const PROBLEM: ApiProblem = { status: 500, code: 'Server', title: 'O servidor falhou.' };

function answer(items: Tag[]): Answer {
  return ok({ items, totalCount: items.length, page: 1, pageSize: 20 });
}

function loaderOf(...answers: Answer[]) {
  const loadItems = vi.fn<Loader>();
  for (const next of answers) loadItems.mockResolvedValueOnce(next);
  loadItems.mockResolvedValue(answers.at(-1) ?? answer([]));
  return loadItems;
}

function CreationProbe({ request }: { request: SearchSelectCreationRequest<Tag> }) {
  const name = request.text || 'Sem nome';
  return (
    <div role="dialog" aria-label="Criar">
      <output aria-label="texto recebido">{request.text}</output>
      <button type="button" onClick={() => request.complete({ id: 'n1', name })}>
        Concluir
      </button>
      <button type="button" onClick={request.cancel}>
        Desistir
      </button>
    </div>
  );
}

function DialogProbe({ request }: { request: SearchSelectCreationRequest<Tag> }) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) request.cancel();
      }}
    >
      <DialogContent finalFocus={request.finalFocus}>
        <DialogTitle>Nova etiqueta de teste</DialogTitle>
        <button type="button" onClick={() => request.complete({ id: 'n2', name: 'Do diálogo' })}>
          Concluir no diálogo
        </button>
        <DialogClose>Fechar diálogo</DialogClose>
      </DialogContent>
    </Dialog>
  );
}

const DIALOG_CREATION: SearchSelectCreation<Tag> = {
  actionLabel: 'Nova etiqueta',
  actionLabelFor: (text) => `Criar etiqueta «${text}»`,
  render: (request) => <DialogProbe request={request} />,
};

const CREATION: SearchSelectCreation<Tag> = {
  actionLabel: 'Nova etiqueta',
  actionLabelFor: (text) => `Criar etiqueta «${text}»`,
  render: (request) => <CreationProbe request={request} />,
};

type Extras = Partial<
  Omit<SearchSelectProps<Tag>, 'value' | 'onValueChange' | 'id' | 'aria-label' | 'loadItems'>
>;

function Harness(props: Extras & { initial?: Tag[]; loadItems: Loader }) {
  const { initial = [], loadItems, ...selectProps } = props;
  const [value, setValue] = useState<Tag[]>(initial);
  return (
    <>
      <SearchSelect<Tag>
        aria-label="Etiquetas"
        loadItems={loadItems}
        creation={CREATION}
        {...selectProps}
        value={value}
        onValueChange={setValue}
      />
      <output aria-label="escolhidas">{value.map((tag) => tag.name).join(', ')}</output>
    </>
  );
}

function control() {
  return screen.getByRole('combobox', { name: 'Etiquetas' });
}

function chosen() {
  return screen.getByLabelText('escolhidas');
}

function received() {
  return screen.getByLabelText('texto recebido');
}

function fieldButton() {
  const chips = control().closest('[data-slot="combobox-chips"]');
  const buttons = Array.from(chips?.querySelectorAll('button') ?? []);
  const button = buttons.find((candidate) => candidate.textContent === 'Nova etiqueta');
  if (!button) throw new Error('O botão de criação não está no campo.');
  return button;
}

async function openList(user: ReturnType<typeof userEvent.setup>) {
  await user.click(control());
  return screen.findByRole('listbox');
}

async function searchFor(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(control());
  await user.type(control(), text);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SearchSelect creation from the field button', () => {
  it('opens the creation with the list closed, without loading or opening the list', async () => {
    const user = userEvent.setup();
    const loadItems = loaderOf(answer([VIP]));
    render(<Harness loadItems={loadItems} />);

    await user.click(fieldButton());

    expect(screen.getByRole('dialog', { name: 'Criar' })).toBeInTheDocument();
    expect(received()).toHaveTextContent('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(loadItems).not.toHaveBeenCalled();
  });

  it('closes the open list when the creation starts', async () => {
    const user = userEvent.setup();
    render(<Harness loadItems={loaderOf(answer([VIP]))} />);
    await openList(user);

    await user.click(fieldButton());

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(screen.getByRole('dialog', { name: 'Criar' })).toBeInTheDocument();
  });

  it('comes right after the search on Tab and opens the creation with Enter', async () => {
    const user = userEvent.setup();
    render(<Harness loadItems={loaderOf(answer([VIP]))} />);
    control().focus();

    await user.tab();
    expect(fieldButton()).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('dialog', { name: 'Criar' })).toBeInTheDocument();
  });

  it('passes the typed text without changing what the button says', async () => {
    const user = userEvent.setup();
    render(<Harness loadItems={loaderOf(answer([VIP]), answer([]))} />);
    await searchFor(user, 'Pós-operatório');
    await screen.findByRole('button', { name: 'Criar etiqueta «Pós-operatório»' });

    await user.click(fieldButton());

    expect(received()).toHaveTextContent('Pós-operatório');
  });
});

describe('SearchSelect creation row', () => {
  it('offers the plain action below the list when nothing is typed', async () => {
    const user = userEvent.setup();
    render(<Harness loadItems={loaderOf(answer([VIP, RETORNO]))} />);
    expect(screen.getAllByRole('button', { name: 'Nova etiqueta' })).toHaveLength(1);

    await openList(user);
    await screen.findByRole('option', { name: 'VIP' });

    expect(screen.getByRole('button', { name: 'Nova etiqueta' })).not.toBe(fieldButton());
  });

  it('stays while the first page loads and after it fails', async () => {
    const user = userEvent.setup();
    const loadItems = vi.fn<Loader>(() => new Promise<Answer>(() => undefined));
    const { unmount } = render(<Harness loadItems={loadItems} />);
    await openList(user);
    expect(screen.getByRole('button', { name: 'Nova etiqueta' })).not.toBe(fieldButton());
    unmount();

    render(<Harness loadItems={loaderOf(fail(PROBLEM))} />);
    await openList(user);
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Nova etiqueta' })).not.toBe(fieldButton());
  });

  it('says the typed text and stands out when the search finds nothing', async () => {
    const user = userEvent.setup();
    render(<Harness loadItems={loaderOf(answer([VIP]), answer([]))} />);

    await searchFor(user, '  Pós-operatório');
    const row = await screen.findByRole('button', { name: 'Criar etiqueta «Pós-operatório»' });
    await screen.findByText('Nenhum resultado para «Pós-operatório».');

    expect(row).toHaveClass('bg-accent');
    await user.click(row);
    expect(received()).toHaveTextContent('Pós-operatório');
  });

  it('falls back to the plain action when a result has the typed name in another case', async () => {
    const user = userEvent.setup();
    render(<Harness loadItems={loaderOf(answer([VIP]), answer([VIP]))} />);

    await searchFor(user, 'vip');
    await screen.findByRole('option', { name: 'VIP' });
    const row = await screen.findByRole('button', { name: 'Nova etiqueta' });
    expect(row).not.toHaveClass('bg-accent');
    await user.click(row);

    expect(received()).toHaveTextContent('');
  });
});

describe('SearchSelect creation result', () => {
  it('adds the created item to the choices and returns focus to the empty search', async () => {
    const user = userEvent.setup();
    render(<Harness loadItems={loaderOf(answer([VIP]), answer([]))} initial={[VIP]} />);

    await user.click(fieldButton());
    await user.click(screen.getByRole('button', { name: 'Concluir' }));

    expect(chosen()).toHaveTextContent('VIP, Sem nome');
    expect(control()).toHaveFocus();
    expect(screen.queryByRole('dialog', { name: 'Criar' })).not.toBeInTheDocument();

    await searchFor(user, 'Pós-operatório');
    await user.click(
      await screen.findByRole('button', { name: 'Criar etiqueta «Pós-operatório»' }),
    );
    await user.click(screen.getByRole('button', { name: 'Concluir' }));

    expect(chosen()).toHaveTextContent('VIP, Sem nome, Pós-operatório');
    expect(control()).toHaveFocus();
    await waitFor(() => expect(control()).toHaveValue(''));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('returns focus to the empty search and keeps the choices when cancelled', async () => {
    const user = userEvent.setup();
    render(<Harness loadItems={loaderOf(answer([VIP]), answer([]))} initial={[VIP]} />);

    await searchFor(user, 'Pós');
    await user.click(await screen.findByRole('button', { name: 'Criar etiqueta «Pós»' }));
    await user.click(screen.getByRole('button', { name: 'Desistir' }));

    expect(chosen()).toHaveTextContent('VIP');
    expect(control()).toHaveFocus();
    await waitFor(() => expect(control()).toHaveValue(''));
  });

  it('returns focus to the search after a real dialog completes or closes', async () => {
    const user = userEvent.setup();
    render(<Harness loadItems={loaderOf(answer([VIP]))} creation={DIALOG_CREATION} />);

    await user.click(fieldButton());
    await user.click(await screen.findByRole('button', { name: 'Concluir no diálogo' }));
    await waitFor(() => expect(control()).toHaveFocus());
    expect(chosen()).toHaveTextContent('Do diálogo');

    await user.click(fieldButton());
    await user.click(await screen.findByRole('button', { name: 'Fechar diálogo' }));
    await waitFor(() => expect(control()).toHaveFocus());
    await user.click(fieldButton());
    await screen.findByRole('button', { name: 'Concluir no diálogo' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(control()).toHaveFocus());
    expect(chosen()).toHaveTextContent('Do diálogo');
  });

  it('opens no list for presses and keys inside the creation', async () => {
    const user = userEvent.setup();
    const loadItems = loaderOf(answer([VIP]));
    render(<Harness loadItems={loadItems} />);

    await user.click(fieldButton());
    const dialog = screen.getByRole('dialog', { name: 'Criar' });
    fireEvent.mouseDown(dialog);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Concluir' }), { key: 'ArrowDown' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(loadItems).not.toHaveBeenCalled();
  });

  it('keeps a form inside the creation from submitting the form around the field', async () => {
    const user = userEvent.setup();
    const outerSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    const innerSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    const creation: SearchSelectCreation<Tag> = {
      ...CREATION,
      render: () =>
        createPortal(
          <form onSubmit={innerSubmit}>
            <button type="submit">Salvar criação</button>
          </form>,
          document.body,
        ),
    };
    render(
      <form onSubmit={outerSubmit}>
        <Harness loadItems={loaderOf(answer([VIP]))} creation={creation} />
      </form>,
    );

    await user.click(fieldButton());
    await user.click(screen.getByRole('button', { name: 'Salvar criação' }));

    expect(innerSubmit).toHaveBeenCalledTimes(1);
    expect(outerSubmit).not.toHaveBeenCalled();
  });
});

describe('SearchSelect creation limits', () => {
  it('keeps the button focusable but unavailable at the limit and says why', async () => {
    const user = userEvent.setup();
    render(
      <Harness loadItems={loaderOf(answer([VIP, RETORNO]))} initial={[VIP]} maxSelected={1} />,
    );

    expect(fieldButton()).toHaveAttribute('aria-disabled', 'true');
    expect(fieldButton()).toHaveAccessibleDescription(/Limite de 1 seleção atingido/);
    await user.click(fieldButton());
    expect(screen.queryByRole('dialog', { name: 'Criar' })).not.toBeInTheDocument();

    await openList(user);
    await screen.findByRole('option', { name: 'Retorno' });
    expect(screen.getByRole('button', { name: 'Nova etiqueta' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('offers no creation while the field is disabled', () => {
    render(<Harness loadItems={loaderOf(answer([VIP]))} disabled />);

    expect(fieldButton()).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows neither the button nor the row without a creation', async () => {
    const user = userEvent.setup();
    render(<Harness loadItems={loaderOf(answer([VIP]))} creation={undefined} />);
    expect(screen.queryByRole('button', { name: 'Nova etiqueta' })).not.toBeInTheDocument();

    await openList(user);
    await screen.findByRole('option', { name: 'VIP' });

    expect(screen.queryByText('Nova etiqueta')).not.toBeInTheDocument();
  });
});
