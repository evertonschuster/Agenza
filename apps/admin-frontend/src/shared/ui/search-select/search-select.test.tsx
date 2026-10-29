import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchSelect, type SearchSelectMultipleProps, type SearchSelectSingleProps } from '.';

interface Option {
  id: string;
  name: string;
  color?: string;
}

const VIP: Option = { id: 't1', name: 'VIP', color: '#8b5cf6' };
const RETORNO: Option = { id: 't2', name: 'Retorno', color: '#0d9488' };
const CONVENIO: Option = { id: 't3', name: 'Convênio' };
const OPTIONS = [CONVENIO, RETORNO, VIP];

type MultipleExtras = Partial<Omit<SearchSelectMultipleProps<Option>, 'multiple' | 'value'>>;

function Multiple({ initial = [], ...props }: MultipleExtras & { initial?: Option[] }) {
  const [value, setValue] = useState<Option[]>(initial);
  return (
    <>
      <label htmlFor="tags">Etiquetas</label>
      <SearchSelect<Option>
        id="tags"
        items={OPTIONS}
        emptyMessage="Nenhuma etiqueta cadastrada."
        {...props}
        multiple
        value={value}
        onValueChange={setValue}
      />
      <output aria-label="escolhidas">{value.map((option) => option.name).join(', ')}</output>
    </>
  );
}

type SingleExtras = Partial<Omit<SearchSelectSingleProps<Option>, 'multiple' | 'value'>>;

function Single(props: SingleExtras) {
  const [value, setValue] = useState<Option | null>(null);
  return (
    <>
      <label htmlFor="status">Situação</label>
      <SearchSelect<Option>
        id="status"
        items={OPTIONS}
        {...props}
        value={value}
        onValueChange={setValue}
      />
      <output aria-label="escolhida">{value?.name ?? 'nenhuma'}</output>
    </>
  );
}

async function openList(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('combobox', { name }));
  return screen.findByRole('listbox');
}

describe('SearchSelect with a fixed list and several choices', () => {
  it('lists the given items and keeps the list open while choosing', async () => {
    const user = userEvent.setup();
    render(<Multiple />);

    const list = await openList(user, 'Etiquetas');
    await user.click(within(list).getByRole('option', { name: 'VIP' }));
    await user.click(within(list).getByRole('option', { name: 'Retorno' }));

    expect(screen.getByLabelText('escolhidas')).toHaveTextContent('VIP, Retorno');
    expect(screen.getByRole('option', { name: 'VIP' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Selecionadas: 2')).toBeInTheDocument();
  });

  it('filters the list by the typed text, ignoring accents', async () => {
    const user = userEvent.setup();
    render(<Multiple />);

    await user.type(screen.getByRole('combobox', { name: 'Etiquetas' }), 'conv');

    expect(await screen.findByRole('option', { name: 'Convênio' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'VIP' })).not.toBeInTheDocument();
  });

  it('says when the typed text matches nothing', async () => {
    const user = userEvent.setup();
    render(<Multiple />);

    await user.type(screen.getByRole('combobox', { name: 'Etiquetas' }), 'xyz');

    expect(await screen.findByText('Nenhum resultado para “xyz”.')).toBeInTheDocument();
  });

  it('says there is nothing to choose, offering only selection', async () => {
    const user = userEvent.setup();
    render(<Multiple items={[]} />);

    await user.click(screen.getByRole('combobox', { name: 'Etiquetas' }));

    expect(await screen.findByText('Nenhuma etiqueta cadastrada.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows each choice with a named remove button that takes it out', async () => {
    const user = userEvent.setup();
    render(<Multiple initial={[VIP, RETORNO]} />);

    await user.click(screen.getByRole('button', { name: 'Remover VIP' }));

    expect(screen.getByLabelText('escolhidas')).toHaveTextContent('Retorno');
    expect(screen.queryByRole('button', { name: 'Remover VIP' })).not.toBeInTheDocument();
  });

  it('makes the other options unavailable once the limit is reached', async () => {
    const user = userEvent.setup();
    render(<Multiple initial={[VIP, RETORNO]} maxSelected={2} />);

    await openList(user, 'Etiquetas');

    expect(screen.getByRole('option', { name: 'Convênio' })).toHaveAttribute(
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
});

describe('SearchSelect with one choice', () => {
  it('shows the chosen item in the field, closes the list and can clear it', async () => {
    const user = userEvent.setup();
    render(<Single />);

    const list = await openList(user, 'Situação');
    await user.click(within(list).getByRole('option', { name: 'Retorno' }));

    expect(screen.getByLabelText('escolhida')).toHaveTextContent('Retorno');
    expect(screen.getByRole('combobox', { name: 'Situação' })).toHaveValue('Retorno');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Limpar seleção' }));

    expect(screen.getByLabelText('escolhida')).toHaveTextContent('nenhuma');
  });

  it('lists every item when reopened, not only the chosen one', async () => {
    const user = userEvent.setup();
    render(<Single />);

    const list = await openList(user, 'Situação');
    await user.click(within(list).getByRole('option', { name: 'VIP' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Mostrar opções' }));

    expect(await screen.findAllByRole('option')).toHaveLength(3);
  });
});

describe('SearchSelect fed by a source that loads its items', () => {
  it('hands the typed text to the source and lists its items unfiltered', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    render(<Single onSearchChange={onSearchChange} />);

    await user.type(screen.getByRole('combobox', { name: 'Situação' }), 'vi');

    expect(onSearchChange).toHaveBeenLastCalledWith('vi');
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('tells the source when the list opens and closes', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Single onOpenChange={onOpenChange} />);

    await openList(user, 'Situação');
    await user.keyboard('{Escape}');

    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  it('shows loading instead of the empty message while the source loads', async () => {
    const user = userEvent.setup();
    render(<Single items={[]} loading />);

    await user.click(screen.getByRole('combobox', { name: 'Situação' }));

    expect(await screen.findByText('Carregando…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma opção disponível.')).not.toBeInTheDocument();
  });

  it('shows the failure with its detail and a retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<Single items={[]} failure={{ detail: 'Muitas tentativas. Aguarde.', onRetry }} />);

    await user.click(screen.getByRole('combobox', { name: 'Situação' }));
    const alert = await screen.findByRole('alert');
    await user.click(within(alert).getByRole('button', { name: 'Tentar novamente' }));

    expect(alert).toHaveTextContent('Não foi possível carregar as opções.');
    expect(alert).toHaveTextContent('Muitas tentativas. Aguarde.');
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('offers the next page when the source has more', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    render(<Single more={{ total: 10, pending: false, onLoadMore }} />);

    await openList(user, 'Situação');
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(screen.getByText('Mostrando 3 de 10')).toBeInTheDocument();
    expect(onLoadMore).toHaveBeenCalledOnce();
  });
});
