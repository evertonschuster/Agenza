import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckboxGroup } from './index';

const OPTIONS = [
  { value: 'emergency', label: 'Emergência' },
  { value: 'operationalSupport', label: 'Apoio operacional' },
  { value: 'dailyCommunication', label: 'Comunicação cotidiana' },
];

describe('CheckboxGroup', () => {
  it('renders a named group with one checkbox per option', () => {
    render(
      <CheckboxGroup
        options={OPTIONS}
        value={[]}
        onValueChange={vi.fn()}
        aria-label="Finalidades do contato"
      />,
    );

    expect(screen.getByRole('group', { name: 'Finalidades do contato' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByRole('checkbox', { name: 'Apoio operacional' })).toBeInTheDocument();
  });

  it('checks only the options present in value', () => {
    render(
      <CheckboxGroup
        options={OPTIONS}
        value={['emergency', 'dailyCommunication']}
        onValueChange={vi.fn()}
        aria-label="Finalidades do contato"
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Emergência' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Apoio operacional' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Comunicação cotidiana' })).toBeChecked();
  });

  it('reports the whole new selection when one option is toggled on', async () => {
    const onValueChange = vi.fn();
    render(
      <CheckboxGroup
        options={OPTIONS}
        value={['emergency']}
        onValueChange={onValueChange}
        aria-label="Finalidades do contato"
      />,
    );

    await userEvent.setup().click(screen.getByRole('checkbox', { name: 'Apoio operacional' }));

    expect(onValueChange).toHaveBeenCalledWith(
      ['emergency', 'operationalSupport'],
      expect.anything(),
    );
  });

  it('reports the remaining selection when one option is toggled off', async () => {
    const onValueChange = vi.fn();
    render(
      <CheckboxGroup
        options={OPTIONS}
        value={['emergency', 'operationalSupport']}
        onValueChange={onValueChange}
        aria-label="Finalidades do contato"
      />,
    );

    await userEvent.setup().click(screen.getByRole('checkbox', { name: 'Emergência' }));

    expect(onValueChange).toHaveBeenCalledWith(['operationalSupport'], expect.anything());
  });

  it('toggles from the visible label text too', async () => {
    const onValueChange = vi.fn();
    render(
      <CheckboxGroup
        options={OPTIONS}
        value={[]}
        onValueChange={onValueChange}
        aria-label="Finalidades do contato"
      />,
    );

    await userEvent.setup().click(screen.getByText('Comunicação cotidiana'));

    expect(onValueChange).toHaveBeenCalledWith(['dailyCommunication'], expect.anything());
  });

  it('forwards the ref to the first checkbox so a form can focus it on error', () => {
    const ref = createRef<HTMLElement>();
    render(
      <CheckboxGroup
        ref={ref}
        options={OPTIONS}
        value={[]}
        onValueChange={vi.fn()}
        aria-label="Finalidades do contato"
      />,
    );

    expect(ref.current).toBe(screen.getByRole('checkbox', { name: 'Emergência' }));
  });

  it('describes the group and flags each checkbox as invalid', () => {
    render(
      <>
        <p id="hint">Escolha ao menos uma.</p>
        <CheckboxGroup
          options={OPTIONS}
          value={[]}
          onValueChange={vi.fn()}
          aria-label="Finalidades do contato"
          aria-invalid
          aria-describedby="hint"
        />
      </>,
    );

    const group = screen.getByRole('group', { name: 'Finalidades do contato' });
    expect(group).toHaveAccessibleDescription('Escolha ao menos uma.');
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    }
  });
});
