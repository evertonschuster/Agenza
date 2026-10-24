import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { CpfField } from './cpf-field';

interface DummyValues {
  cpf: string;
}

function Harness({ children, cpf = '' }: { children: React.ReactNode; cpf?: string }) {
  const methods = useForm<DummyValues>({ defaultValues: { cpf } });

  return <FormProvider {...methods}>{children}</FormProvider>;
}

function CurrentValue() {
  const { control } = useFormContext<DummyValues>();
  const cpf = useWatch({ control, name: 'cpf' });
  return <output aria-label="valor do formulário">{cpf}</output>;
}

describe('CpfField', () => {
  it('arrives labelled, optional, numeric, masking what is typed and storing the digits', async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <CpfField<DummyValues> name="cpf" />
        <CurrentValue />
      </Harness>,
    );

    const input = screen.getByLabelText('CPF');
    await user.type(input, '529.982.247-25');

    expect(input).toHaveValue('529.982.247-25');
    expect(screen.getByLabelText('valor do formulário')).toHaveTextContent(/^52998224725$/);
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('placeholder', '000.000.000-00');
    expect(screen.getByText('opcional')).toBeInTheDocument();
  });

  it('shows the digits the form holds with the mask', () => {
    render(
      <Harness cpf="52998224725">
        <CpfField<DummyValues> name="cpf" />
      </Harness>,
    );

    expect(screen.getByLabelText('CPF')).toHaveValue('529.982.247-25');
  });

  it('lets the call site rename the field and change its hint', () => {
    render(
      <Harness>
        <CpfField<DummyValues> name="cpf" label="CPF do responsável" hint="obrigatório" />
      </Harness>,
    );

    expect(screen.getByLabelText('CPF do responsável')).toBeInTheDocument();
    expect(screen.getByText('obrigatório')).toBeInTheDocument();
  });
});
