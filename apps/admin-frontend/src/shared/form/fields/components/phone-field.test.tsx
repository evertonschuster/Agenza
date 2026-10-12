import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { PhoneField } from './phone-field';

interface DummyValues {
  phone: string;
}

function Harness({ children }: { children: React.ReactNode }) {
  const methods = useForm<DummyValues>({ defaultValues: { phone: '' } });

  return <FormProvider {...methods}>{children}</FormProvider>;
}

describe('PhoneField', () => {
  it('arrives as a telephone input capped at the backend limit', () => {
    render(
      <Harness>
        <PhoneField<DummyValues> name="phone" />
      </Harness>,
    );

    const input = screen.getByLabelText('Telefone');
    expect(input).toHaveAttribute('type', 'tel');
    expect(input).toHaveAttribute('maxlength', '20');
    expect(input).toHaveAttribute('placeholder', '(11) 91234-5678');
    expect(screen.getByText('opcional')).toBeInTheDocument();
  });
});
