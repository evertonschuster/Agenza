import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { PagedResult } from '@/shared/pagination/paging';
import type { SearchSelectCreateLink } from '@/shared/ui/search-select';
import { RemoteSearchSelect, type LoadRemoteItems } from '.';

interface Tag {
  id: string;
  name: string;
  color?: string;
}

const VIP: Tag = { id: 't1', name: 'VIP', color: '#8b5cf6' };
const RETORNO: Tag = { id: 't2', name: 'Retorno', color: '#0d9488' };
const CONVENIO: Tag = { id: 't3', name: 'Convênio' };
const ALL = [CONVENIO, RETORNO, VIP];

function loaderOf(source: Tag[]): LoadRemoteItems<Tag> {
  return vi.fn<LoadRemoteItems<Tag>>(({ search, page, pageSize }) => {
    const matches = source.filter((tag) => tag.name.toLowerCase().includes(search.toLowerCase()));
    const items = matches.slice((page - 1) * pageSize, page * pageSize);
    return Promise.resolve<ApiResult<PagedResult<Tag>>>({
      ok: true,
      data: { items, totalCount: matches.length, page, pageSize },
    });
  });
}

interface MultipleProps {
  loadItems?: LoadRemoteItems<Tag>;
  initial?: Tag[];
  maxSelected?: number;
  pageSize?: number;
  createLink?: SearchSelectCreateLink;
}

function Multiple({
  loadItems = loaderOf(ALL),
  initial = [],
  maxSelected,
  pageSize,
  createLink,
}: MultipleProps) {
  const [value, setValue] = useState<Tag[]>(initial);
  return (
    <MemoryRouter>
      <label htmlFor="tags">Etiquetas</label>
      <RemoteSearchSelect<Tag>
        id="tags"
        multiple
        value={value}
        onValueChange={setValue}
        loadItems={loadItems}
        maxSelected={maxSelected}
        pageSize={pageSize}
        emptyMessage="Nenhuma etiqueta cadastrada."
        createLink={createLink}
      />
      <output aria-label="escolhidas">{value.map((tag) => tag.name).join(', ')}</output>
    </MemoryRouter>
  );
}

function Single({ loadItems = loaderOf(ALL) }: { loadItems?: LoadRemoteItems<Tag> }) {
  const [value, setValue] = useState<Tag | null>(null);
  return (
    <>
      <label htmlFor="tag">Etiqueta</label>
      <RemoteSearchSelect<Tag>
        id="tag"
        value={value}
        onValueChange={setValue}
        loadItems={loadItems}
      />
      <output aria-label="escolhida">{value?.name ?? 'nenhuma'}</output>
    </>
  );
}

async function openList(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('combobox', { name }));
  return screen.findByRole('listbox');
}

describe('RemoteSearchSelect with several choices', () => {
  it('lists what the loader returns when opened and keeps the list open while choosing', async () => {
    const user = userEvent.setup();
    const loadItems = loaderOf(ALL);
    render(<Multiple loadItems={loadItems} />);

    const list = await openList(user, 'Etiquetas');
    await user.click(within(list).getByRole('option', { name: 'VIP' }));
    await user.click(within(list).getByRole('option', { name: 'Retorno' }));

    expect(loadItems).toHaveBeenCalledWith(
      { search: '', page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    );
    expect(screen.getByLabelText('escolhidas')).toHaveTextContent('VIP, Retorno');
    expect(screen.getByRole('option', { name: 'VIP' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Selecionadas: 2')).toBeInTheDocument();
  });

  it('shows each choice with a named remove button that takes it out', async () => {
    const user = userEvent.setup();
    render(<Multiple initial={[VIP, RETORNO]} />);

    await user.click(screen.getByRole('button', { name: 'Remover VIP' }));

    expect(screen.getByLabelText('escolhidas')).toHaveTextContent('Retorno');
    expect(screen.queryByRole('button', { name: 'Remover VIP' })).not.toBeInTheDocument();
  });

  it('searches the loader with the typed text', async () => {
    const user = userEvent.setup();
    const loadItems = loaderOf(ALL);
    render(<Multiple loadItems={loadItems} />);

    await user.type(screen.getByRole('combobox', { name: 'Etiquetas' }), 'ret');

    expect(await screen.findByRole('option', { name: 'Retorno' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('option', { name: 'VIP' })).not.toBeInTheDocument(),
    );
    expect(loadItems).toHaveBeenLastCalledWith(
      { search: 'ret', page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    );
  });

  it('says when the search finds nothing', async () => {
    const user = userEvent.setup();
    render(<Multiple />);

    await user.type(screen.getByRole('combobox', { name: 'Etiquetas' }), 'xyz');

    expect(await screen.findByText('Nenhum resultado para “xyz”.')).toBeInTheDocument();
  });

  it('says there is nothing to choose and offers to create one in a new tab', async () => {
    const user = userEvent.setup();
    render(
      <Multiple
        loadItems={loaderOf([])}
        createLink={{ label: 'Criar etiqueta', to: '/tags/new' }}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Etiquetas' }));

    expect(await screen.findByText('Nenhuma etiqueta cadastrada.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar etiqueta' })).toHaveAttribute(
      'target',
      '_blank',
    );
  });

  it('loads the next page below the current one', async () => {
    const user = userEvent.setup();
    render(<Multiple pageSize={2} />);

    await openList(user, 'Etiquetas');
    expect(await screen.findByText('Mostrando 2 de 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByRole('option', { name: 'VIP' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
  });

  it('makes the other options unavailable once the limit is reached', async () => {
    const user = userEvent.setup();
    render(<Multiple initial={[VIP, RETORNO]} maxSelected={2} />);

    await openList(user, 'Etiquetas');

    expect(await screen.findByRole('option', { name: 'Convênio' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('option', { name: 'VIP' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByText(/Limite de 2 seleções atingido/)).toBeInTheDocument();
    expect(screen.getByText('Selecionadas: 2 de 2')).toBeInTheDocument();
  });

  it('clears every choice at once', async () => {
    const user = userEvent.setup();
    render(<Multiple initial={[VIP, RETORNO]} />);

    await openList(user, 'Etiquetas');
    await user.click(screen.getByRole('button', { name: 'Limpar seleção' }));

    expect(screen.getByLabelText('escolhidas')).toBeEmptyDOMElement();
  });

  it('shows the failure with the server message and tries again', async () => {
    const user = userEvent.setup();
    const succeed = loaderOf(ALL);
    const loadItems = vi
      .fn<LoadRemoteItems<Tag>>()
      .mockResolvedValueOnce({
        ok: false,
        error: { status: 429, code: 'RateLimited', title: 'Muitas tentativas. Aguarde.' },
      })
      .mockImplementation(succeed);
    render(<Multiple loadItems={loadItems} />);

    await user.click(screen.getByRole('combobox', { name: 'Etiquetas' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar as opções.');
    expect(alert).toHaveTextContent('Muitas tentativas. Aguarde.');
    await user.click(within(alert).getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('option', { name: 'VIP' })).toBeInTheDocument();
  });
});

describe('RemoteSearchSelect with one choice', () => {
  it('shows the chosen item in the field, closes the list and can clear it', async () => {
    const user = userEvent.setup();
    render(<Single />);

    const list = await openList(user, 'Etiqueta');
    await user.click(within(list).getByRole('option', { name: 'Retorno' }));

    expect(screen.getByLabelText('escolhida')).toHaveTextContent('Retorno');
    expect(screen.getByRole('combobox', { name: 'Etiqueta' })).toHaveValue('Retorno');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Limpar seleção' }));

    expect(screen.getByLabelText('escolhida')).toHaveTextContent('nenhuma');
  });

  it('lists every item when reopened, not only the chosen name', async () => {
    const user = userEvent.setup();
    const loadItems = loaderOf(ALL);
    render(<Single loadItems={loadItems} />);

    const list = await openList(user, 'Etiqueta');
    await user.click(within(list).getByRole('option', { name: 'VIP' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Mostrar opções' }));

    expect(await screen.findAllByRole('option')).toHaveLength(3);
    expect(loadItems).toHaveBeenLastCalledWith(
      { search: '', page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    );
  });
});
