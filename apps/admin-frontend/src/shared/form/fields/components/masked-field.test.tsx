import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { MaskedField } from './masked-field';

interface DummyValues {
  code: string;
}

const fourDigits = (typed: string) => typed.replace(/\D/g, '').slice(0, 4);

const dashAfterTwo = (value: string) => {
  const digits = fourDigits(value);
  return digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits;
};

function Harness({ withError = false, code = '' }: { withError?: boolean; code?: string }) {
  const methods = useForm<DummyValues>({ defaultValues: { code } });

  useEffect(() => {
    if (withError) methods.setError('code', { type: 'test', message: 'Erro de teste' });
  }, [withError, methods]);

  return (
    <FormProvider {...methods}>
      <MaskedField<DummyValues>
        name="code"
        label="Código"
        hint="opcional"
        mask={dashAfterTwo}
        unmask={fourDigits}
      />
      <CurrentValue />
    </FormProvider>
  );
}

function CurrentValue() {
  const { control } = useFormContext<DummyValues>();
  const code = useWatch({ control, name: 'code' });
  return <output aria-label="valor do formulário">{code}</output>;
}

describe('MaskedField', () => {
  it('shows what is typed with the mask and stores it unmasked in the form', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Código'), 'a1b2c3d4e5');

    expect(screen.getByLabelText('Código')).toHaveValue('12-34');
    expect(screen.getByLabelText('valor do formulário')).toHaveTextContent(/^1234$/);
  });

  it('shows a value the form already holds with the mask', () => {
    render(<Harness code="1234" />);

    expect(screen.getByLabelText('Código')).toHaveValue('12-34');
  });

  it('shows the hint and the field error tied to the input', () => {
    render(<Harness withError />);

    expect(screen.getByText('opcional')).toBeInTheDocument();
    expect(screen.getByLabelText('Código')).toHaveAccessibleDescription(/Erro de teste/);
  });
});
