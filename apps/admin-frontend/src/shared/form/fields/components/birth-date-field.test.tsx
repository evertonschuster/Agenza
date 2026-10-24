import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { BirthDateField } from './birth-date-field';

interface DummyValues {
  birthDate: Date | null;
}

function Harness({ children }: { children: React.ReactNode }) {
  const methods = useForm<DummyValues>({ defaultValues: { birthDate: null } });

  return <FormProvider {...methods}>{children}</FormProvider>;
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-02T12:00:00Z'), toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
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
