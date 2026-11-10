import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useFormState, useWatch } from 'react-hook-form';
import { ok } from '@/shared/result';
import { SearchSelectField } from './search-select-field';

interface Tag {
  id: string;
  name: string;
}

interface DummyValues {
  tags: Tag[];
}

const VIP: Tag = { id: 't1', name: 'VIP' };
const RETORNO: Tag = { id: 't2', name: 'Retorno' };

const loadItems = vi.fn(() =>
  Promise.resolve(ok({ items: [VIP, RETORNO], totalCount: 2, page: 1, pageSize: 20 })),
);

function ValueProbe() {
  const tags = useWatch<DummyValues, 'tags'>({ name: 'tags' });
  const { touchedFields } = useFormState<DummyValues>();
  return (
    <>
      <output aria-label="valor">{tags.map((tag) => tag.id).join(',')}</output>
      <output aria-label="tocado">{touchedFields.tags ? 'sim' : 'não'}</output>
    </>
  );
}

function Harness({ initial = [], error }: { initial?: Tag[]; error?: string }) {
  const methods = useForm<DummyValues>({ defaultValues: { tags: initial } });

  useEffect(() => {
    if (error) methods.setError('tags', { type: 'test', message: error }, { shouldFocus: true });
  }, [error, methods]);

  return (
    <FormProvider {...methods}>
      <SearchSelectField<DummyValues>
        name="tags"
        label="Etiquetas"
        hint="opcional"
        loadItems={loadItems}
      />
      <ValueProbe />
    </FormProvider>
  );
}

describe('SearchSelectField', () => {
  it('names the control by its label, describes it by the hint and shows the current value', () => {
    render(<Harness initial={[VIP]} />);

    const control = screen.getByRole('combobox', { name: 'Etiquetas' });
    expect(control).toHaveAccessibleDescription('opcional');
    expect(control).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByRole('button', { name: 'Remover VIP' })).toBeInTheDocument();
  });

  it('keeps the chosen items in the form value', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('combobox', { name: 'Etiquetas' }));
    const list = await screen.findByRole('listbox');
    await user.click(await within(list).findByRole('option', { name: 'Retorno' }));

    expect(screen.getByLabelText('valor')).toHaveTextContent('t2');
  });

  it('marks the field touched when the focus leaves it', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('combobox', { name: 'Etiquetas' }));
    await user.keyboard('{Escape}');
    await user.tab();

    expect(screen.getByLabelText('tocado')).toHaveTextContent('sim');
  });

  it('shows the field error under the control, marks it invalid and focuses it', () => {
    render(<Harness error="Escolha no máximo 20 etiquetas." />);

    const control = screen.getByRole('combobox', { name: 'Etiquetas' });
    expect(screen.getByText('Escolha no máximo 20 etiquetas.')).toBeInTheDocument();
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(control).toHaveFocus();
  });
});
