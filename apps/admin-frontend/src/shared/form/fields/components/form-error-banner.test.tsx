import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { FormErrorBanner } from './form-error-banner';

interface DummyValues {
  name: string;
}

function Harness({ errorType }: { errorType?: string }) {
  const methods = useForm<DummyValues>({ defaultValues: { name: '' } });

  useEffect(() => {
    if (errorType) {
      methods.setError('root.serverError', { type: errorType, message: 'Já existe um registro.' });
    }
  }, [errorType, methods]);

  return (
    <FormProvider {...methods}>
      <FormErrorBanner />
    </FormProvider>
  );
}

describe('FormErrorBanner', () => {
  it('renders nothing when there is no root server error', () => {
    render(<Harness />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the message as an alert when a root server error is set', () => {
    render(<Harness errorType="server" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Já existe um registro.');
  });

  it('shows the problem code under the message when the error type carries one', () => {
    render(<Harness errorType="RateLimit.Exceeded" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Já existe um registro.');
    expect(screen.getByText('Código: RateLimit.Exceeded')).toBeInTheDocument();
  });

  it('shows no code line when the error has no code of its own', () => {
    render(<Harness errorType="server" />);

    expect(screen.queryByText(/Código:/)).not.toBeInTheDocument();
  });
});
