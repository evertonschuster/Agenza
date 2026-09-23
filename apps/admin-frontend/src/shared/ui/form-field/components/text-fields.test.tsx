import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { TextField, TextareaField } from './text-fields';

interface DummyValues {
  name: string;
  bio: string;
}

function Harness({ withError = false }: { withError?: boolean }) {
  const methods = useForm<DummyValues>({ defaultValues: { name: '', bio: '' } });

  useEffect(() => {
    if (withError) methods.setError('name', { type: 'test', message: 'Erro de teste' });
  }, [withError, methods]);

  return (
    <FormProvider {...methods}>
      <TextField name="name" label="Nome" hint="até 40 caracteres" />
      <TextareaField name="bio" label="Bio" />
    </FormProvider>
  );
}

describe('TextField', () => {
  it('links the label to the input and shows the hint via aria-describedby', () => {
    render(<Harness />);

    const input = screen.getByLabelText('Nome');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAttribute('aria-describedby', 'field-name-hint');
    expect(screen.getByText('até 40 caracteres')).toBeInTheDocument();
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
    expect(screen.getByText('Erro de teste')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'field-name-error');
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
