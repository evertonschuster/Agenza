import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { CpfField } from './cpf-field';

interface DummyValues {
  cpf: string;
}

function Harness({ children }: { children: React.ReactNode }) {
  const methods = useForm<DummyValues>({ defaultValues: { cpf: '' } });

  return <FormProvider {...methods}>{children}</FormProvider>;
}

describe('CpfField', () => {
  it('arrives labelled, optional, numeric and masking what is typed', async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <CpfField<DummyValues> name="cpf" />
      </Harness>,
    );

    const input = screen.getByLabelText('CPF');
    await user.type(input, '52998224725');

    expect(input).toHaveValue('529.982.247-25');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('placeholder', '000.000.000-00');
    expect(screen.getByText('opcional')).toBeInTheDocument();
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
