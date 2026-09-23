import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import type { ColorSwatchPickerOption } from '@/shared/ui/color-swatch-picker';
import { ColorField } from './color-field';

interface DummyValues {
  color: string | null;
}

const OPTIONS: readonly ColorSwatchPickerOption[] = [
  { value: '#f59e0b', label: 'Âmbar' },
  { value: '#0ea5e9', label: 'Azul' },
];

function Harness({ withError = false }: { withError?: boolean }) {
  const methods = useForm<DummyValues>({ defaultValues: { color: null } });

  useEffect(() => {
    if (withError) methods.setError('color', { type: 'test', message: 'A cor é obrigatória.' });
  }, [withError, methods]);

  return (
    <FormProvider {...methods}>
      <ColorField name="color" label="Cor" aria-label="Cor da etiqueta" options={OPTIONS} />
    </FormProvider>
  );
}

describe('ColorField', () => {
  it('renders a visible label without htmlFor, and a radiogroup with the given aria-label', () => {
    render(<Harness />);

    expect(screen.getByText('Cor')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Cor da etiqueta' })).toBeInTheDocument();
  });

  it('updates the form value when an option is picked', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('radio', { name: 'Azul' }));

    expect(screen.getByRole('radio', { name: 'Azul' })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows the field error and wires aria-describedby to it on the radiogroup', () => {
    render(<Harness withError />);

    expect(screen.getByText('A cor é obrigatória.')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Cor da etiqueta' })).toHaveAttribute(
      'aria-describedby',
      'field-color-error',
    );
  });
});
