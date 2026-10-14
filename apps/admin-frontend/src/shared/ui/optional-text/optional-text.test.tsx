import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OptionalText } from './index';

describe('OptionalText', () => {
  it('shows the value as it is when there is one', () => {
    render(<OptionalText value="(11) 91234-5678" />);

    expect(screen.getByText('(11) 91234-5678')).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
    expect(screen.queryByText('Não informado')).not.toBeInTheDocument();
  });

  it.each([[null], [undefined]] as const)(
    'shows a dash hidden from assistive tech, and says "Não informado" to it, when the value is %s',
    (value) => {
      render(<OptionalText value={value} />);

      expect(screen.getByText('—')).toHaveAttribute('aria-hidden', 'true');
      expect(screen.getByText('Não informado')).toHaveClass('sr-only');
    },
  );

  it('shows the fallback as visible, faded italic text instead of the dash when the value is missing', () => {
    render(<OptionalText value={null} fallback="Sem descrição" />);

    expect(screen.getByText('Sem descrição')).toHaveClass('italic', 'opacity-70');
    expect(screen.queryByText('—')).not.toBeInTheDocument();
    expect(screen.queryByText('Não informado')).not.toBeInTheDocument();
  });

  it('ignores the fallback when there is a value', () => {
    render(<OptionalText value="Desconto temporário" fallback="Sem descrição" />);

    expect(screen.getByText('Desconto temporário')).not.toHaveClass('italic');
    expect(screen.queryByText('Sem descrição')).not.toBeInTheDocument();
  });

  it('applies className to the value, to the fallback and to the dash', () => {
    const { rerender } = render(
      <OptionalText value="ana@example.com" className="whitespace-nowrap" />,
    );
    expect(screen.getByText('ana@example.com')).toHaveClass('whitespace-nowrap');

    rerender(<OptionalText value={null} fallback="Sem descrição" className="whitespace-nowrap" />);
    expect(screen.getByText('Sem descrição')).toHaveClass('whitespace-nowrap');

    rerender(<OptionalText value={null} className="whitespace-nowrap" />);
    expect(screen.getByText('—')).toHaveClass('whitespace-nowrap');
  });
});
