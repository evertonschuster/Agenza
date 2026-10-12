import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm, type FieldErrors, type Path } from 'react-hook-form';
import { FieldError } from './field-error';

interface DummyValues {
  name: string;
  guardians: { name: string }[];
}

function Harness({
  name = 'guardians',
  errors,
  serverMessage,
}: {
  name?: Path<DummyValues>;
  errors?: FieldErrors<DummyValues>;
  serverMessage?: string;
}) {
  const methods = useForm<DummyValues>({
    defaultValues: { name: '', guardians: [{ name: '' }] },
    resolver: () => ({ values: {}, errors: errors ?? {} }),
  });

  useEffect(() => {
    if (serverMessage !== undefined) {
      methods.setError(name, { type: 'server', message: serverMessage });
    } else if (errors) {
      void methods.trigger();
    }
  }, [errors, serverMessage, name, methods]);

  return (
    <FormProvider {...methods}>
      <FieldError<DummyValues> name={name} />
      <button type="button" onClick={() => methods.clearErrors(name)}>
        Limpar erro
      </button>
    </FormProvider>
  );
}

describe('FieldError', () => {
  it('renders nothing when the field has no error', () => {
    render(<Harness />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders a backend collection error as an alert', () => {
    render(<Harness serverMessage="Informe um responsável." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Informe um responsável.');
    expect(screen.getByRole('alert')).toHaveClass('text-sm', 'text-destructive');
  });

  it('prefers an array root validation message over a direct message', async () => {
    render(
      <Harness
        errors={{
          guardians: {
            type: 'validation',
            message: 'Mensagem direta.',
            root: { type: 'minLength', message: 'Informe ao menos um responsável.' },
          },
        }}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Informe ao menos um responsável.');
    expect(screen.queryByText('Mensagem direta.')).not.toBeInTheDocument();
  });

  it('renders errors for a nested indexed field', () => {
    render(<Harness name="guardians.0.name" serverMessage="O nome é obrigatório." />);

    expect(screen.getByRole('alert')).toHaveTextContent('O nome é obrigatório.');
  });

  it('also works for a simple field and removes the alert when its error is cleared', () => {
    render(<Harness name="name" serverMessage="O nome é obrigatório." />);

    expect(screen.getByRole('alert')).toHaveTextContent('O nome é obrigatório.');
    fireEvent.click(screen.getByRole('button', { name: 'Limpar erro' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not render an alert for an empty message', () => {
    render(<Harness serverMessage="" />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
