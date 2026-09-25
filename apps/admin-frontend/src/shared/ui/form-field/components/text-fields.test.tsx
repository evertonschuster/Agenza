import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { TextField, TextareaField } from './text-fields';

interface DummyValues {
  name: string;
  bio: string;
  address: { city: string };
}

function Harness({ withError = false }: { withError?: boolean }) {
  const methods = useForm<DummyValues>({
    defaultValues: { name: '', bio: '', address: { city: '' } },
  });

  useEffect(() => {
    if (!withError) return;
    methods.setError('name', { type: 'test', message: 'Erro de teste' });
    methods.setError('address.city', { type: 'test', message: 'Cidade inválida' });
  }, [withError, methods]);

  return (
    <FormProvider {...methods}>
      <TextField<DummyValues> name="name" label="Nome" hint="até 40 caracteres" />
      <TextareaField<DummyValues> name="bio" label="Bio" />
      <TextField<DummyValues> name="address.city" label="Cidade" />
    </FormProvider>
  );
}

describe('TextField', () => {
  it('links the label to the input and shows the hint via aria-describedby', () => {
    render(<Harness />);

    const input = screen.getByLabelText('Nome');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAccessibleDescription('até 40 caracteres');
  });

  it('registers the field so typing updates the form value', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Nome'), 'Ana');

    expect(screen.getByLabelText('Nome')).toHaveValue('Ana');
  });

  it('shows the field error instead of the hint, with aria wired to it', () => {
    render(<Harness withError />);

    const input = screen.getByLabelText('Nome');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Erro de teste');
  });

  it('shows the error of a nested field path, not only of a top-level one', () => {
    render(<Harness withError />);

    const input = screen.getByLabelText('Cidade');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Cidade inválida');
  });
});

describe('TextareaField', () => {
  it('registers the field so typing updates the form value', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Bio'), 'Olá');

    expect(screen.getByLabelText('Bio')).toHaveValue('Olá');
  });
});
