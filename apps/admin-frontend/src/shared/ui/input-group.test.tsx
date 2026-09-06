import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './input-group';

describe('InputGroupAddon', () => {
  it('focuses the sibling input when the addon itself is clicked', () => {
    render(
      <InputGroup>
        <InputGroupAddon>icon</InputGroupAddon>
        <InputGroupInput placeholder="Buscar" />
      </InputGroup>,
    );

    fireEvent.click(screen.getByText('icon'));

    expect(screen.getByPlaceholderText('Buscar')).toHaveFocus();
  });

  it('does not steal focus when the click lands on a button inside the addon', () => {
    render(
      <InputGroup>
        <InputGroupAddon>
          <InputGroupButton>Limpar</InputGroupButton>
        </InputGroupAddon>
        <InputGroupInput placeholder="Buscar" />
      </InputGroup>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    expect(screen.getByPlaceholderText('Buscar')).not.toHaveFocus();
  });

  it('still calls a caller-provided onClick instead of silently replacing it', () => {
    const onClick = vi.fn();
    render(
      <InputGroup>
        <InputGroupAddon onClick={onClick}>icon</InputGroupAddon>
        <InputGroupInput placeholder="Buscar" />
      </InputGroup>,
    );

    fireEvent.click(screen.getByText('icon'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('skips the focus handoff when the caller-provided onClick prevents default', () => {
    render(
      <InputGroup>
        <InputGroupAddon onClick={(e) => e.preventDefault()}>icon</InputGroupAddon>
        <InputGroupInput placeholder="Buscar" />
      </InputGroup>,
    );

    fireEvent.click(screen.getByText('icon'));

    expect(screen.getByPlaceholderText('Buscar')).not.toHaveFocus();
  });
});
