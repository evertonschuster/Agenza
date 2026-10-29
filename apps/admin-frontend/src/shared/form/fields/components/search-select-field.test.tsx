import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { SearchSelectField } from './search-select-field';

interface Weekday {
  id: string;
  name: string;
}

interface DummyValues {
  day: Weekday | null;
}

const MONDAY: Weekday = { id: 'mon', name: 'Segunda-feira' };
const TUESDAY: Weekday = { id: 'tue', name: 'Terça-feira' };

function ValueProbe() {
  const day = useWatch<DummyValues, 'day'>({ name: 'day' });
  return <output aria-label="valor">{day?.id ?? ''}</output>;
}

function Harness({ withError = false }: { withError?: boolean }) {
  const methods = useForm<DummyValues>({ defaultValues: { day: null } });

  useEffect(() => {
    if (withError) {
      methods.setError('day', { type: 'test', message: 'Escolha um dia.' }, { shouldFocus: true });
    }
  }, [withError, methods]);

  return (
    <FormProvider {...methods}>
      <SearchSelectField<DummyValues, Weekday>
        name="day"
        label="Dia"
        hint="obrigatório"
        items={[MONDAY, TUESDAY]}
      />
      <ValueProbe />
    </FormProvider>
  );
}

describe('SearchSelectField', () => {
  it('names the control by its label and describes it by the hint', () => {
    render(<Harness />);

    const control = screen.getByRole('combobox', { name: 'Dia' });
    expect(control).toHaveAccessibleDescription('obrigatório');
    expect(control).toHaveAttribute('aria-invalid', 'false');
  });

  it('keeps the chosen item from the fixed list in the form value', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('combobox', { name: 'Dia' }));
    await user.click(
      within(await screen.findByRole('listbox')).getByRole('option', { name: 'Terça-feira' }),
    );

    expect(screen.getByLabelText('valor')).toHaveTextContent('tue');
  });

  it('shows the field error under the control, marks it invalid and focuses it', () => {
    render(<Harness withError />);

    const control = screen.getByRole('combobox', { name: 'Dia' });
    expect(screen.getByText('Escolha um dia.')).toBeInTheDocument();
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(control).toHaveFocus();
  });
});
