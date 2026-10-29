import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import type { LoadRemoteItems } from '@/shared/ui/remote-search-select';
import { RemoteSearchSelectField } from './remote-search-select-field';

interface Tag {
  id: string;
  name: string;
}

interface DummyValues {
  tags: Tag[];
}

const VIP: Tag = { id: 't1', name: 'VIP' };
const RETORNO: Tag = { id: 't2', name: 'Retorno' };

const loadTags: LoadRemoteItems<Tag> = ({ page, pageSize }) =>
  Promise.resolve({ ok: true, data: { items: [VIP, RETORNO], totalCount: 2, page, pageSize } });

function ValueProbe() {
  const tags = useWatch<DummyValues, 'tags'>({ name: 'tags' });
  return <output aria-label="valor">{tags.map((tag) => tag.id).join(',')}</output>;
}

function Harness({ withError = false }: { withError?: boolean }) {
  const methods = useForm<DummyValues>({ defaultValues: { tags: [RETORNO] } });

  useEffect(() => {
    if (withError) {
      methods.setError(
        'tags',
        { type: 'Tag.NotFound', message: 'Etiqueta não encontrada.' },
        { shouldFocus: true },
      );
    }
  }, [withError, methods]);

  return (
    <FormProvider {...methods}>
      <RemoteSearchSelectField<DummyValues, Tag>
        name="tags"
        label="Etiquetas"
        hint="opcional · até 20"
        loadItems={loadTags}
        multiple
        maxSelected={20}
      />
      <ValueProbe />
    </FormProvider>
  );
}

describe('RemoteSearchSelectField', () => {
  it('names the control by its label, describes it by the hint and shows the current value', () => {
    render(<Harness />);

    const control = screen.getByRole('combobox', { name: 'Etiquetas' });
    expect(control).toHaveAccessibleDescription('opcional · até 20');
    expect(control).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByRole('button', { name: 'Remover Retorno' })).toBeInTheDocument();
  });

  it('keeps the chosen items in the form value', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('combobox', { name: 'Etiquetas' }));
    await user.click(
      within(await screen.findByRole('listbox')).getByRole('option', { name: 'VIP' }),
    );

    expect(screen.getByLabelText('valor')).toHaveTextContent('t2,t1');
  });

  it('shows the field error under the control, marks it invalid and focuses it', () => {
    render(<Harness withError />);

    const control = screen.getByRole('combobox', { name: 'Etiquetas' });
    expect(screen.getByText('Etiqueta não encontrada.')).toBeInTheDocument();
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(control).toHaveFocus();
  });
});
