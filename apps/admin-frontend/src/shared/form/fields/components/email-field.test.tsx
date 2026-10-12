import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { EmailField } from './email-field';

interface DummyValues {
  email: string;
}

function Harness({ children }: { children: React.ReactNode }) {
  const methods = useForm<DummyValues>({ defaultValues: { email: '' } });

  return <FormProvider {...methods}>{children}</FormProvider>;
}

describe('EmailField', () => {
  it('arrives as an e-mail input capped at the backend limit', () => {
    render(
      <Harness>
        <EmailField<DummyValues> name="email" />
      </Harness>,
    );

    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('maxlength', '254');
    expect(input).toHaveAttribute('placeholder', 'nome@exemplo.com');
    expect(screen.getByText('opcional')).toBeInTheDocument();
  });
});
