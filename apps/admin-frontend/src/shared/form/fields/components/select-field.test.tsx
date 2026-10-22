import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import type { SelectFieldOption } from '../fields.types';
import { SelectField } from './select-field';

type Size = 'small' | 'medium' | 'large';

interface DummyValues {
  size: Size;
}

const OPTIONS: readonly SelectFieldOption<Size>[] = [
  { value: 'small', label: 'Pequeno' },
  { value: 'medium', label: 'Médio' },
  { value: 'large', label: 'Grande' },
];

function ValueProbe() {
  const size = useWatch<DummyValues, 'size'>({ name: 'size' });
  return <output aria-label="valor">{size}</output>;
}

function Harness({
  inline = false,
  hint,
  withError = false,
}: {
  inline?: boolean;
  hint?: string;
  withError?: boolean;
}) {
  const methods = useForm<DummyValues>({ defaultValues: { size: 'medium' } });

  useEffect(() => {
    if (withError) {
      methods.setError(
        'size',
        { type: 'test', message: 'Escolha um tamanho.' },
        { shouldFocus: true },
      );
    }
  }, [withError, methods]);

  return (
    <FormProvider {...methods}>
      {inline ? (
        <SelectField<DummyValues, 'size'>
          name="size"
          label="Tamanho"
          options={OPTIONS}
          labelPlacement="inline"
        />
      ) : (
        <SelectField<DummyValues, 'size'>
          name="size"
          label="Tamanho"
          options={OPTIONS}
          hint={hint}
        />
      )}
      <ValueProbe />
    </FormProvider>
  );
}

describe('SelectField', () => {
  it('names the select by its visible label and shows the label of the current value', () => {
    render(<Harness />);

    expect(screen.getByText('Tamanho')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Tamanho' })).toHaveTextContent('Médio');
  });

  it('lists the options in the order given', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('combobox', { name: 'Tamanho' }));

    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Pequeno', 'Médio', 'Grande']);
  });

  it('writes the picked option into the form value', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('combobox', { name: 'Tamanho' }));
    await user.click(await screen.findByRole('option', { name: 'Grande' }));

    expect(screen.getByLabelText('valor')).toHaveTextContent('large');
    expect(screen.getByRole('combobox', { name: 'Tamanho' })).toHaveTextContent('Grande');
  });

  it('describes the select by its hint', () => {
    render(<Harness hint="opcional" />);

    expect(screen.getByRole('combobox', { name: 'Tamanho' })).toHaveAccessibleDescription(
      'opcional',
    );
  });

  it('shows the error, marks the select invalid and takes the focus on error', async () => {
    render(<Harness withError />);

    const select = screen.getByRole('combobox', { name: 'Tamanho' });
    expect(await screen.findByText('Escolha um tamanho.')).toBeVisible();
    expect(select).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(select).toHaveFocus());
  });

  describe('with the label inline', () => {
    it('puts the label inside the trigger, before the value, and keeps it as the name', () => {
      render(<Harness inline />);

      const select = screen.getByRole('combobox', { name: 'Tamanho' });
      expect(select).toHaveTextContent('Tamanho:Médio');
    });

    it('writes the picked option into the form value', async () => {
      const user = userEvent.setup();
      render(<Harness inline />);

      await user.click(screen.getByRole('combobox', { name: 'Tamanho' }));
      await user.click(await screen.findByRole('option', { name: 'Pequeno' }));

      expect(screen.getByLabelText('valor')).toHaveTextContent('small');
      expect(screen.getByRole('combobox', { name: 'Tamanho' })).toHaveTextContent(
        'Tamanho:Pequeno',
      );
    });

    it('marks the select invalid on error', async () => {
      render(<Harness inline withError />);

      await waitFor(() =>
        expect(screen.getByRole('combobox', { name: 'Tamanho' })).toHaveAttribute(
          'aria-invalid',
          'true',
        ),
      );
    });
  });
});
