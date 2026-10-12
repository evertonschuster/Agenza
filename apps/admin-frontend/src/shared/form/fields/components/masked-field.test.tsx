import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { MaskedField } from './masked-field';

interface DummyValues {
  code: string;
}

const dashAfterTwo = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits;
};

function Harness({ withError = false }: { withError?: boolean }) {
  const methods = useForm<DummyValues>({ defaultValues: { code: '' } });

  useEffect(() => {
    if (withError) methods.setError('code', { type: 'test', message: 'Erro de teste' });
  }, [withError, methods]);

  return (
    <FormProvider {...methods}>
      <MaskedField<DummyValues> name="code" label="Código" hint="opcional" mask={dashAfterTwo} />
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
  it('formats what is typed with the mask and stores the masked text in the form', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Código'), 'a1b2c3d4e5');

    expect(screen.getByLabelText('Código')).toHaveValue('12-34');
    expect(screen.getByLabelText('valor do formulário')).toHaveTextContent('12-34');
  });

  it('shows the hint and the field error tied to the input', () => {
    render(<Harness withError />);

    expect(screen.getByText('opcional')).toBeInTheDocument();
    expect(screen.getByLabelText('Código')).toHaveAccessibleDescription(/Erro de teste/);
  });
});
