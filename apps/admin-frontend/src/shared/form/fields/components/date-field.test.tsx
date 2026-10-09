import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { DateField } from './date-field';

interface DummyValues {
  birthDate: string;
}

interface HarnessProps {
  initial?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

function Harness({ initial = '', disabled = false, readOnly = false }: HarnessProps) {
  const methods = useForm<DummyValues>({ defaultValues: { birthDate: initial } });

  return (
    <FormProvider {...methods}>
      <DateField<DummyValues>
        name="birthDate"
        label="Data de nascimento"
        hint="opcional"
        minDate="1990-01-01"
        maxDate="2026-10-01"
        disabled={disabled}
        readOnly={readOnly}
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

function calendarButton() {
  return screen.getByRole('button', { name: 'Abrir calendário' });
}

async function openCalendar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(calendarButton());
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

  it('names the calendar button without repeating the field label, so the label still finds one control', () => {
    render(<Harness />);

    expect(calendarButton()).not.toHaveAccessibleName(/data de nascimento/i);
    expect(screen.getAllByLabelText(/data de nascimento/i)).toHaveLength(1);
  });

  it.each([['disabled'], ['readOnly']] as const)(
    'does not open the calendar from the button or the arrow key while the field is %s',
    async (mode) => {
      const user = userEvent.setup();
      render(<Harness {...{ [mode]: true }} />);

      expect(calendarButton()).toBeDisabled();
      await user.click(input());
      await user.keyboard('{ArrowDown}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
  );

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
