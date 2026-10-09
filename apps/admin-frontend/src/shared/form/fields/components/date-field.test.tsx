import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { DateField } from './date-field';

interface DummyValues {
  birthDate: string;
}

function Harness({ initial = '' }: { initial?: string }) {
  const methods = useForm<DummyValues>({ defaultValues: { birthDate: initial } });

  return (
    <FormProvider {...methods}>
      <DateField<DummyValues>
        name="birthDate"
        label="Data de nascimento"
        hint="opcional"
        minDate="1990-01-01"
        maxDate="2026-10-01"
      />
      <CurrentValue />
    </FormProvider>
  );
}

function CurrentValue() {
  const { control } = useFormContext<DummyValues>();
  const birthDate = useWatch({ control, name: 'birthDate' });
  return <output aria-label="valor do formulário">{birthDate}</output>;
}

function input() {
  return screen.getByLabelText('Data de nascimento');
}

async function openCalendar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Abrir calendário de data de nascimento' }));
  return screen.findByRole('dialog');
}

describe('DateField', () => {
  it('masks what is typed as dd/mm/aaaa and stores the masked text in the form', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), '20051990');

    expect(input()).toHaveValue('20/05/1990');
    expect(screen.getByLabelText('valor do formulário')).toHaveTextContent('20/05/1990');
  });

  it('shows the dd/mm/aaaa placeholder and the numeric keyboard hint', () => {
    render(<Harness />);

    expect(input()).toHaveAttribute('placeholder', 'dd/mm/aaaa');
    expect(input()).toHaveAttribute('inputmode', 'numeric');
  });

  it('keeps the calendar closed until it is asked for', () => {
    render(<Harness />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the calendar from the button on the month of the latest allowed date', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const calendar = await openCalendar(user);

    expect(within(calendar).getByRole('grid', { name: 'outubro 2026' })).toBeInTheDocument();
  });

  it('opens the calendar with the arrow down key from the input', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(input());
    await user.keyboard('{ArrowDown}');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('fills the field with the picked day and closes the calendar', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const calendar = await openCalendar(user);
    await user.click(within(calendar).getByRole('button', { name: /, 1 de outubro de 2026/ }));

    expect(input()).toHaveValue('01/10/2026');
    expect(screen.getByLabelText('valor do formulário')).toHaveTextContent('01/10/2026');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on the month of a typed date and marks that day as selected', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), '15032000');
    const calendar = await openCalendar(user);

    expect(within(calendar).getByRole('grid', { name: 'março 2000' })).toBeInTheDocument();
    expect(
      within(calendar).getByRole('button', { name: /, 15 de março de 2000, selecionado/ }),
    ).toBeInTheDocument();
  });

  it('opens on the month of a date the form already holds', async () => {
    const user = userEvent.setup();
    render(<Harness initial="07/08/1995" />);

    const calendar = await openCalendar(user);

    expect(within(calendar).getByRole('grid', { name: 'agosto 1995' })).toBeInTheDocument();
  });

  it('does not mark a typed date outside the allowed range as selected', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), '05102026');
    const calendar = await openCalendar(user);

    expect(within(calendar).queryByRole('button', { name: /selecionado/ })).not.toBeInTheDocument();
    expect(within(calendar).getByRole('grid', { name: 'outubro 2026' })).toBeInTheDocument();
  });

  it('disables the days after the latest allowed date', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const calendar = await openCalendar(user);

    expect(within(calendar).getByRole('button', { name: /, 2 de outubro de 2026/ })).toBeDisabled();
    expect(within(calendar).getByRole('button', { name: /, 1 de outubro de 2026/ })).toBeEnabled();
  });

  it('jumps to another year through the year dropdown', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const calendar = await openCalendar(user);
    await user.selectOptions(
      within(calendar).getByRole('combobox', { name: 'Escolha o ano' }),
      '2000',
    );

    expect(within(calendar).getByRole('grid', { name: 'outubro 2000' })).toBeInTheDocument();
  });

  it('limits the year dropdown to the allowed range', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const calendar = await openCalendar(user);
    const years = within(
      within(calendar).getByRole('combobox', { name: 'Escolha o ano' }),
    ).getAllByRole('option');

    expect(years[0]).toHaveTextContent('1990');
    expect(years.at(-1)).toHaveTextContent('2026');
  });
});
