import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { BirthDateField, CpfField, EmailField, PhoneField } from './value-fields';

interface DummyValues {
  birthDate: string;
  cpf: string;
  phone: string;
  email: string;
}

function Harness({ children }: { children: React.ReactNode }) {
  const methods = useForm<DummyValues>({
    defaultValues: { birthDate: '', cpf: '', phone: '', email: '' },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-02T12:00:00Z'), toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
});

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

describe('BirthDateField', () => {
  it('arrives labelled and optional, and swaps the hint for the age once the date is complete', async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <BirthDateField<DummyValues> name="birthDate" />
      </Harness>,
    );

    expect(screen.getByText('opcional')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Data de nascimento'), '20051990');

    expect(screen.getByText('36 anos')).toBeInTheDocument();
    expect(screen.queryByText('opcional')).not.toBeInTheDocument();
  });

  it('keeps the optional hint while the typed date is not a valid birth date', async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <BirthDateField<DummyValues> name="birthDate" />
      </Harness>,
    );

    await user.type(screen.getByLabelText('Data de nascimento'), '02102026');

    expect(screen.getByText('opcional')).toBeInTheDocument();
  });

  it('prefers a hint given by the call site over the age', async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <BirthDateField<DummyValues> name="birthDate" hint="obrigatório" />
      </Harness>,
    );

    await user.type(screen.getByLabelText('Data de nascimento'), '20051990');

    expect(screen.getByText('obrigatório')).toBeInTheDocument();
    expect(screen.queryByText('36 anos')).not.toBeInTheDocument();
  });
});
