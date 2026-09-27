import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { FormErrorBanner } from './form-error-banner';

interface DummyValues {
  name: string;
}

function Harness({ withError = false }: { withError?: boolean }) {
  const methods = useForm<DummyValues>({ defaultValues: { name: '' } });

  useEffect(() => {
    if (withError) {
      methods.setError('root.serverError', { type: 'server', message: 'Já existe um registro.' });
    }
  }, [withError, methods]);

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
    render(<Harness withError />);

    expect(screen.getByRole('alert')).toHaveTextContent('Já existe um registro.');
  });
});
