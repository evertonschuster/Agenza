import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorSwatchPicker } from './index';

const OPTIONS = [
  { value: '#0d9488', label: 'Verde-azulado' },
  { value: '#0ea5e9', label: 'Azul' },
  { value: '#8b5cf6', label: 'Violeta' },
];

describe('ColorSwatchPicker', () => {
  it('renders a radiogroup with the given accessible name and one radio per option', () => {
    render(
      <ColorSwatchPicker
        options={OPTIONS}
        value={null}
        onValueChange={vi.fn()}
        aria-label="Cor da etiqueta"
      />,
    );

    expect(screen.getByRole('radiogroup', { name: 'Cor da etiqueta' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Azul' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Violeta' })).toBeInTheDocument();
  });

  it('marks only the option matching value as checked', () => {
    render(
      <ColorSwatchPicker
        options={OPTIONS}
        value="#0ea5e9"
        onValueChange={vi.fn()}
        aria-label="Cor da etiqueta"
      />,
    );

    expect(screen.getByRole('radio', { name: 'Azul' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Violeta' })).toHaveAttribute('aria-checked', 'false');
  });

  it('leaves every option unchecked when value is null', () => {
    render(
      <ColorSwatchPicker
        options={OPTIONS}
        value={null}
        onValueChange={vi.fn()}
        aria-label="Cor da etiqueta"
      />,
    );

    for (const option of OPTIONS) {
      expect(screen.getByRole('radio', { name: option.label })).toHaveAttribute(
        'aria-checked',
        'false',
      );
    }
  });

  it('calls onValueChange with the clicked option value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ColorSwatchPicker
        options={OPTIONS}
        value={null}
        onValueChange={onValueChange}
        aria-label="Cor da etiqueta"
      />,
    );

    await user.click(screen.getByRole('radio', { name: 'Violeta' }));

    expect(onValueChange).toHaveBeenCalledWith('#8b5cf6');
  });

  it('moves the checked option with the arrow keys (roving tabindex)', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ColorSwatchPicker
        options={OPTIONS}
        value="#0d9488"
        onValueChange={onValueChange}
        aria-label="Cor da etiqueta"
      />,
    );

    screen.getByRole('radio', { name: 'Verde-azulado' }).focus();
    await user.keyboard('{ArrowRight}');

    expect(onValueChange).toHaveBeenCalledWith('#0ea5e9');
  });

  it.each([
    ['the checked option', '#8b5cf6', 'Violeta'],
    ['the first option when none is checked', null, 'Verde-azulado'],
    ['the first option when the value is outside the palette', '#123456', 'Verde-azulado'],
  ])('points its ref at %s, the tab stop a focus call should land on', (_, value, label) => {
    const ref = createRef<HTMLElement>();
    render(
      <ColorSwatchPicker
        ref={ref}
        options={OPTIONS}
        value={value}
        onValueChange={vi.fn()}
        aria-label="Cor da etiqueta"
      />,
    );

    expect(ref.current).toBe(screen.getByRole('radio', { name: label }));
  });

  it('forwards aria-invalid and onBlur to the radiogroup', async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(
      <>
        <ColorSwatchPicker
          options={OPTIONS}
          value={null}
          onValueChange={vi.fn()}
          onBlur={onBlur}
          aria-label="Cor da etiqueta"
          aria-invalid
        />
        <button type="button">depois</button>
      </>,
    );

    expect(screen.getByRole('radiogroup', { name: 'Cor da etiqueta' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    await user.click(screen.getByRole('radio', { name: 'Azul' }));
    await user.click(screen.getByRole('button', { name: 'depois' }));

    expect(onBlur).toHaveBeenCalled();
  });
});
