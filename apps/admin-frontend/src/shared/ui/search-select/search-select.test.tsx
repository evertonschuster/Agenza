import { useState, type FormEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApiProblem, ApiResult } from '@/shared/api/servicesFacade';
import type { PagedResult } from '@/shared/pagination/paging';
import { fail, ok } from '@/shared/result';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog';
import { SearchSelect, type SearchItemsQuery, type SearchSelectProps } from '.';

interface Tag {
  id: string;
  name: string;
  color?: string;
}

type Answer = ApiResult<PagedResult<Tag>>;
type Loader = (query: SearchItemsQuery, signal: AbortSignal) => Promise<Answer>;

const VIP: Tag = { id: 't1', name: 'VIP', color: '#8b5cf6' };
const RETORNO: Tag = { id: 't2', name: 'Retorno', color: '#0d9488' };
const CONVENIO: Tag = { id: 't3', name: 'Convênio' };
const PROBLEM: ApiProblem = { status: 500, code: 'Server', title: 'O servidor falhou.' };

function answer(items: Tag[], totalCount = items.length, page = 1): Answer {
  return ok({ items, totalCount, page, pageSize: 20 });
}

function pageOfTwo(items: Tag[], totalCount: number, page = 1): Answer {
  return ok({ items, totalCount, page, pageSize: 2 });
}

function loaderOf(...answers: Answer[]) {
  const loadItems = vi.fn<Loader>();
  for (const next of answers) loadItems.mockResolvedValueOnce(next);
  loadItems.mockResolvedValue(answers.at(-1) ?? answer([]));
  return loadItems;
}

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
        emptyMessage="Nenhuma etiqueta cadastrada."
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

async function openList(user: ReturnType<typeof userEvent.setup>) {
  await user.click(control());
  return screen.findByRole('listbox');
}

function layOutTallList() {
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(600);
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(250);
  return (list: HTMLElement, scrollTop: number) => {
    Object.defineProperty(list, 'scrollTop', { configurable: true, value: scrollTop });
    fireEvent.scroll(list);
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SearchSelect', () => {
  it('lists what the loader returns when opened and keeps the list open while choosing', async () => {
    const user = userEvent.setup();
    const loadItems = loaderOf(answer([CONVENIO, RETORNO, VIP]));
    render(<Harness loadItems={loadItems} />);

    const list = await openList(user);
    await user.click(await within(list).findByRole('option', { name: 'VIP' }));
    await user.click(within(list).getByRole('option', { name: 'Retorno' }));

    expect(loadItems).toHaveBeenCalledWith(
      { search: '', page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    );
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(within(list).getByRole('option', { name: 'VIP' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(chosen()).toHaveTextContent('VIP, Retorno');
    expect(screen.getByText('Selecionadas: 2')).toBeInTheDocument();
  });

  it('shows each choice with a named remove button that takes it out', async () => {
    const user = userEvent.setup();
    render(<Harness loadItems={loaderOf(answer([]))} initial={[VIP, CONVENIO]} />);

    await user.click(screen.getByRole('button', { name: 'Remover VIP' }));

    expect(screen.queryByRole('button', { name: 'Remover VIP' })).not.toBeInTheDocument();
    expect(chosen()).toHaveTextContent('Convênio');
  });

  it('draws each choice and each option with the caller renderItem', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        loadItems={loaderOf(answer([CONVENIO, VIP]))}
        initial={[VIP]}
        renderItem={(tag) => <mark>{`${tag.name} ${tag.color ?? 'sem cor'}`}</mark>}
      />,
    );

    expect(screen.getByText('VIP #8b5cf6')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover VIP' })).toBeInTheDocument();
    const list = await openList(user);
    expect(
      await within(list).findByRole('option', { name: 'Convênio sem cor' }),
    ).toBeInTheDocument();
  });

  it('removes the last choice with Backspace on an empty search', async () => {
    const user = userEvent.setup();
    render(<Harness loadItems={loaderOf(answer([]))} initial={[VIP, CONVENIO]} />);

    control().focus();
    await user.keyboard('{Backspace}');

    expect(chosen()).toHaveTextContent('VIP');
  });

  it('keeps every choice when Escape is pressed with the list closed', async () => {
    const user = userEvent.setup();
    render(<Harness loadItems={loaderOf(answer([]))} initial={[VIP, CONVENIO]} />);

    control().focus();
    await user.keyboard('{Escape}');

    expect(chosen()).toHaveTextContent('VIP, Convênio');
  });

  it('searches with the typed text once the typing pauses', async () => {
    const user = userEvent.setup();
    const loadItems = loaderOf(answer([CONVENIO, RETORNO, VIP]), answer([VIP]));
    render(<Harness loadItems={loadItems} />);

    const list = await openList(user);
    await within(list).findByRole('option', { name: 'Convênio' });
    await user.type(control(), 'vi');

    await waitFor(() =>
      expect(loadItems).toHaveBeenLastCalledWith(
        { search: 'vi', page: 1, pageSize: 20 },
        expect.any(AbortSignal),
      ),
    );
    expect(await within(list).findByRole('option', { name: 'VIP' })).toBeInTheDocument();
    expect(within(list).queryByRole('option', { name: 'Convênio' })).not.toBeInTheDocument();
  });

  it('says when the search finds nothing and when there is nothing to choose', async () => {
    const user = userEvent.setup();
    const loadItems = loaderOf(answer([]), answer([]));
    render(<Harness loadItems={loadItems} />);

    await openList(user);
    expect(await screen.findByText('Nenhuma etiqueta cadastrada.')).toBeInTheDocument();

    await user.type(control(), 'zz');
    expect(await screen.findByText('Nenhum resultado para «zz».')).toBeInTheDocument();
  });

  it('announces loading instead of an empty message until the first page arrives', async () => {
    const user = userEvent.setup();
    const loadItems = vi.fn<Loader>(() => new Promise<Answer>(() => {}));
    render(<Harness loadItems={loadItems} />);

    await openList(user);

    expect(await screen.findByText('Carregando opções…')).toBeInTheDocument();
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Nenhuma etiqueta cadastrada.')).not.toBeInTheDocument();
  });

  it('marks a chosen item as selected even when the loaded copy is another object', async () => {
    const user = userEvent.setup();
    render(<Harness loadItems={loaderOf(answer([CONVENIO, VIP]))} initial={[{ ...VIP }]} />);

    const list = await openList(user);
    const vip = await within(list).findByRole('option', { name: 'VIP' });
    expect(vip).toHaveAttribute('aria-selected', 'true');

    await user.click(vip);

    expect(chosen()).toHaveTextContent('');
  });

  it('asks nothing more after a search result is chosen and the search is cleared', async () => {
    const user = userEvent.setup();
    const loadItems = loaderOf(answer([CONVENIO, RETORNO, VIP]), answer([VIP]));
    render(<Harness loadItems={loadItems} />);

    const list = await openList(user);
    await within(list).findByRole('option', { name: 'Convênio' });
    await user.type(control(), 'vi');
    await waitFor(() => expect(loadItems).toHaveBeenCalledTimes(2));
    await user.click(await within(list).findByRole('option', { name: 'VIP' }));
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(chosen()).toHaveTextContent('VIP');
    expect(loadItems).toHaveBeenCalledTimes(2);
  });

  it('drops the closed list, so a search that reopens it shows no old options', async () => {
    const user = userEvent.setup();
    const loadItems = vi.fn<Loader>();
    loadItems
      .mockResolvedValueOnce(answer([CONVENIO, RETORNO, VIP]))
      .mockReturnValue(new Promise<Answer>(() => {}));
    render(<Harness loadItems={loadItems} />);

    const list = await openList(user);
    await within(list).findByRole('option', { name: 'Convênio' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await user.keyboard('v');

    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Convênio' })).not.toBeInTheDocument();
  });

  it('limits the typed search to the given length', () => {
    render(<Harness loadItems={loaderOf(answer([]))} maxLength={254} />);

    expect(control()).toHaveAttribute('maxlength', '254');
  });

  it('shows the failure with the server message and tries again', async () => {
    const user = userEvent.setup();
    const loadItems = loaderOf(fail(PROBLEM), answer([VIP]));
    render(
      <Harness loadItems={loadItems} errorMessage="Não foi possível carregar as etiquetas." />,
    );

    const list = await openList(user);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar as etiquetas.');
    expect(alert).toHaveTextContent('O servidor falhou.');

    await user.click(within(alert).getByRole('button', { name: 'Tentar novamente' }));

    expect(await within(list).findByRole('option', { name: 'VIP' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a failed next page below the list, asks nothing more on scroll and retries it', async () => {
    const user = userEvent.setup();
    const scrollTo = layOutTallList();
    const loadItems = loaderOf(
      pageOfTwo([CONVENIO, RETORNO], 3),
      fail(PROBLEM),
      pageOfTwo([VIP], 3, 2),
    );
    render(<Harness loadItems={loadItems} pageSize={2} />);

    const list = await openList(user);
    await within(list).findByRole('option', { name: 'Convênio' });
    scrollTo(list, 320);
    const alert = await screen.findByRole('alert');
    expect(list.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    scrollTo(list, 330);
    expect(loadItems).toHaveBeenCalledTimes(2);

    await user.click(within(alert).getByRole('button', { name: 'Tentar novamente' }));

    expect(await within(list).findByRole('option', { name: 'VIP' })).toBeInTheDocument();
    expect(within(list).getAllByRole('option')).toHaveLength(3);
  });

  it('makes the other options unavailable once the limit is reached and says so', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        loadItems={loaderOf(answer([CONVENIO, RETORNO, VIP]))}
        initial={[VIP]}
        maxSelected={1}
      />,
    );

    const list = await openList(user);

    expect(await within(list).findByRole('option', { name: 'Retorno' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(within(list).getByRole('option', { name: 'VIP' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getAllByText(/Limite de 1 seleção atingido/)).not.toHaveLength(0);
    expect(screen.getByText('Selecionadas: 1 de 1')).toBeInTheDocument();
  });

  it('clears every choice at once', async () => {
    const user = userEvent.setup();
    render(<Harness loadItems={loaderOf(answer([VIP]))} initial={[VIP, RETORNO]} />);

    await openList(user);
    await user.click(screen.getByRole('button', { name: 'Limpar seleção' }));

    expect(chosen()).toHaveTextContent('');
    expect(screen.getByRole('button', { name: 'Limpar seleção' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('loads the next page while the list does not fill its height, up to the last one', async () => {
    const user = userEvent.setup();
    const loadItems = loaderOf(pageOfTwo([CONVENIO, RETORNO], 3), pageOfTwo([VIP], 3, 2));
    render(<Harness loadItems={loadItems} pageSize={2} />);

    const list = await openList(user);

    expect(await within(list).findByRole('option', { name: 'VIP' })).toBeInTheDocument();
    expect(loadItems).toHaveBeenCalledTimes(2);
    expect(loadItems).toHaveBeenLastCalledWith(
      { search: '', page: 2, pageSize: 2 },
      expect.any(AbortSignal),
    );
    expect(within(list).getAllByRole('option')).toHaveLength(3);
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
  });

  it('asks for the next page only once scrolled near the end of a tall list', async () => {
    const user = userEvent.setup();
    const scrollTo = layOutTallList();
    const loadItems = loaderOf(pageOfTwo([CONVENIO, RETORNO], 3), pageOfTwo([VIP], 3, 2));
    render(<Harness loadItems={loadItems} pageSize={2} />);

    const list = await openList(user);
    await within(list).findByRole('option', { name: 'Convênio' });
    expect(screen.getByText('Mostrando 2 de 3')).toBeInTheDocument();

    scrollTo(list, 200);
    expect(loadItems).toHaveBeenCalledTimes(1);

    scrollTo(list, 320);
    expect(await within(list).findByRole('option', { name: 'VIP' })).toBeInTheDocument();
    expect(loadItems).toHaveBeenCalledTimes(2);
  });

  it('says it is loading more while the next page is on its way', async () => {
    const user = userEvent.setup();
    const scrollTo = layOutTallList();
    const loadItems = vi.fn<Loader>();
    loadItems
      .mockResolvedValueOnce(pageOfTwo([CONVENIO, RETORNO], 3))
      .mockReturnValue(new Promise<Answer>(() => {}));
    render(<Harness loadItems={loadItems} pageSize={2} />);

    const list = await openList(user);
    await within(list).findByRole('option', { name: 'Convênio' });
    scrollTo(list, 350);

    expect(await screen.findAllByText('Carregando mais…')).not.toHaveLength(0);
  });

  it('neither opens nor loads while disabled', async () => {
    const user = userEvent.setup();
    const loadItems = loaderOf(answer([VIP]));
    render(<Harness loadItems={loadItems} disabled />);

    expect(control()).toBeDisabled();
    await user.click(control());

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(loadItems).not.toHaveBeenCalled();
  });

  it('keeps the choices when the field is disabled while the list is open', async () => {
    const user = userEvent.setup();
    const loadItems = loaderOf(answer([VIP]));
    const { rerender } = render(<Harness loadItems={loadItems} initial={[VIP, RETORNO]} />);

    await openList(user);
    rerender(<Harness loadItems={loadItems} initial={[VIP, RETORNO]} disabled />);
    const clear = screen.getByRole('button', { name: 'Limpar seleção' });
    expect(clear).toHaveAttribute('aria-disabled', 'true');
    await user.click(clear);

    expect(chosen()).toHaveTextContent('VIP, Retorno');
  });
});

describe('SearchSelect inside a form', () => {
  function FormHarness(
    props: Extras & { loadItems: Loader; onSubmit: () => void; initial?: Tag[] },
  ) {
    const { onSubmit, ...harnessProps } = props;
    return (
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Harness {...harnessProps} />
        <button type="submit">Salvar</button>
      </form>
    );
  }

  it('keeps the form and the list when Enter finds no highlighted option', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <FormHarness loadItems={loaderOf(answer([CONVENIO, RETORNO, VIP]))} onSubmit={onSubmit} />,
    );

    const list = await openList(user);
    await within(list).findByRole('option', { name: 'VIP' });
    await user.type(control(), 'r{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(chosen()).toHaveTextContent('');
  });

  it('keeps the form and the list when Enter is pressed on the open list with nothing typed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FormHarness loadItems={loaderOf(answer([VIP]))} onSubmit={onSubmit} />);

    const list = await openList(user);
    await within(list).findByRole('option', { name: 'VIP' });
    await user.keyboard('{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('clears the typed text when the list closes, so Enter then submits', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FormHarness loadItems={loaderOf(answer([VIP]))} onSubmit={onSubmit} />);

    await openList(user);
    await user.type(control(), 'vi');
    await user.keyboard('{Escape}');
    expect(control()).toHaveValue('');
    await user.keyboard('{Enter}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('chooses the highlighted option on Enter without submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FormHarness loadItems={loaderOf(answer([CONVENIO, VIP]))} onSubmit={onSubmit} />);

    const list = await openList(user);
    await within(list).findByRole('option', { name: 'Convênio' });
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(chosen()).toHaveTextContent('Convênio');
  });

  it('keeps the form when Enter is pressed with a modifier on a highlighted option', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FormHarness loadItems={loaderOf(answer([CONVENIO, VIP]))} onSubmit={onSubmit} />);

    const list = await openList(user);
    await within(list).findByRole('option', { name: 'Convênio' });
    await user.keyboard('{ArrowDown}{Shift>}{Enter}{/Shift}');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('neither chooses nor submits on Enter over an option the limit made unavailable', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <FormHarness
        loadItems={loaderOf(answer([CONVENIO, VIP]))}
        onSubmit={onSubmit}
        initial={[VIP]}
        maxSelected={1}
      />,
    );

    const list = await openList(user);
    await within(list).findByRole('option', { name: 'Convênio' });
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(chosen()).toHaveTextContent('VIP');
  });

  it('submits on Enter when the field is closed and empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FormHarness loadItems={loaderOf(answer([VIP]))} onSubmit={onSubmit} />);

    control().focus();
    await user.keyboard('{Enter}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('SearchSelect inside a dialog', () => {
  function DialogHarness({ loadItems, initial }: { loadItems: Loader; initial: Tag[] }) {
    const [open, setOpen] = useState(true);
    const [value, setValue] = useState<Tag[]>(initial);
    return (
      <>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent showCloseButton={false}>
            <DialogTitle>Etiquetas da pessoa</DialogTitle>
            <SearchSelect<Tag>
              aria-label="Etiquetas"
              loadItems={loadItems}
              value={value}
              onValueChange={setValue}
            />
          </DialogContent>
        </Dialog>
        <output aria-label="escolhidas">{value.map((tag) => tag.name).join(', ')}</output>
      </>
    );
  }

  it('closes only the list on Escape while the list is open', async () => {
    const user = userEvent.setup();
    render(<DialogHarness loadItems={loaderOf(answer([VIP]))} initial={[]} />);

    const list = await openList(user);
    await within(list).findByRole('option', { name: 'VIP' });
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(screen.getByRole('dialog', { name: 'Etiquetas da pessoa' })).toBeInTheDocument();
  });

  it('lets Escape close the dialog when the list is closed, keeping the choices', async () => {
    const user = userEvent.setup();
    render(<DialogHarness loadItems={loaderOf(answer([VIP]))} initial={[VIP, CONVENIO]} />);

    control().focus();
    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Etiquetas da pessoa' })).not.toBeInTheDocument(),
    );
    expect(chosen()).toHaveTextContent('VIP, Convênio');
  });
});
