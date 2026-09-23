import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { ControlledField } from './controlled-field';

interface DummyValues {
  choice: string | null;
}

function Harness({ withError = false }: { withError?: boolean }) {
  const methods = useForm<DummyValues>({ defaultValues: { choice: null } });

  useEffect(() => {
    if (withError) methods.setError('choice', { type: 'test', message: 'Erro de teste' });
  }, [withError, methods]);

  return (
    <FormProvider {...methods}>
      <ControlledField name="choice" label="Escolha" labelHtmlFor={false}>
        {(field, controlProps) => (
          <div
            role="group"
            aria-label="Escolha"
            aria-describedby={controlProps['aria-describedby']}
          >
            <button
              type="button"
              aria-pressed={field.value === 'a'}
              onClick={() => field.onChange('a')}
            >
              A
            </button>
            <button
              type="button"
              aria-pressed={field.value === 'b'}
              onClick={() => field.onChange('b')}
            >
              B
            </button>
          </div>
        )}
      </ControlledField>
    </FormProvider>
  );
}

describe('ControlledField', () => {
  it('gives the render function a field bound to the form, so choosing an option updates it', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const optionA = screen.getByRole('button', { name: 'A' });
    expect(optionA).toHaveAttribute('aria-pressed', 'false');

    await user.click(optionA);

    expect(optionA).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the field error and wires aria-describedby to it, without relying on htmlFor', () => {
    render(<Harness withError />);

    expect(screen.getByText('Erro de teste')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Escolha' })).toHaveAttribute(
      'aria-describedby',
      'field-choice-error',
    );
  });
});
