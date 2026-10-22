import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { SearchField } from './search-field';

interface DummyValues {
  term: string;
}

function ValueProbe() {
  const term = useWatch<DummyValues, 'term'>({ name: 'term' });
  return <output aria-label="valor">{term}</output>;
}

function Harness({
  inline = false,
  hint,
  withError = false,
}: {
  inline?: boolean;
  hint?: string;
  withError?: boolean;
}) {
  const methods = useForm<DummyValues>({ defaultValues: { term: '' } });

  useEffect(() => {
    if (withError) {
      methods.setError(
        'term',
        { type: 'test', message: 'Busca longa demais.' },
        { shouldFocus: true },
      );
    }
  }, [withError, methods]);

  return (
    <FormProvider {...methods}>
      {inline ? (
        <SearchField<DummyValues>
          name="term"
          label="Buscar produtos"
          placeholder="Nome ou código..."
          maxLength={20}
          labelPlacement="inline"
        />
      ) : (
        <SearchField<DummyValues> name="term" label="Buscar produtos" hint={hint} maxLength={20} />
      )}
      <ValueProbe />
    </FormProvider>
  );
}

describe('SearchField', () => {
  it('names the field by its visible label and passes the input props through', () => {
    render(<Harness />);

    expect(screen.getByText('Buscar produtos')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Buscar produtos' })).toHaveAttribute(
      'maxlength',
      '20',
    );
  });

  it('writes what is typed into the form value', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByRole('textbox', { name: 'Buscar produtos' }), 'caneta');

    expect(screen.getByLabelText('valor')).toHaveTextContent('caneta');
  });

  it('describes the field by its hint', () => {
    render(<Harness hint="opcional" />);

    expect(screen.getByRole('textbox', { name: 'Buscar produtos' })).toHaveAccessibleDescription(
      'opcional',
    );
  });

  it('shows the error, marks the field invalid and takes the focus on error', async () => {
    render(<Harness withError />);

    const field = screen.getByRole('textbox', { name: 'Buscar produtos' });
    expect(await screen.findByText('Busca longa demais.')).toBeVisible();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(field).toHaveFocus());
  });

  describe('with the label inline', () => {
    it('keeps the label as the name only, with the placeholder on screen', () => {
      render(<Harness inline />);

      const field = screen.getByRole('textbox', { name: 'Buscar produtos' });
      expect(field).toHaveAttribute('placeholder', 'Nome ou código...');
      expect(screen.queryByText('Buscar produtos')).not.toBeInTheDocument();
    });

    it('writes what is typed into the form value', async () => {
      const user = userEvent.setup();
      render(<Harness inline />);

      await user.type(screen.getByRole('textbox', { name: 'Buscar produtos' }), 'lápis');

      expect(screen.getByLabelText('valor')).toHaveTextContent('lápis');
    });

    it('marks the field invalid and takes the focus on error', async () => {
      render(<Harness inline withError />);

      const field = screen.getByRole('textbox', { name: 'Buscar produtos' });
      await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
      await waitFor(() => expect(field).toHaveFocus());
    });
  });
});
