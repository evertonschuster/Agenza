import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProblemCode } from './index';

describe('ProblemCode', () => {
  it('shows the code with its label, small and muted', () => {
    render(<ProblemCode code="RateLimit.Exceeded" />);

    const line = screen.getByText('Código: RateLimit.Exceeded');
    expect(line).toHaveClass('text-xs');
    expect(line).toHaveClass('text-muted-foreground');
  });

  it.each([[undefined], [null], ['']])('renders nothing for the code %j', (code) => {
    const { container } = render(<ProblemCode code={code} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('lets the caller add spacing without losing the size', () => {
    render(<ProblemCode code="Tag.NotFound" className="mt-1" />);

    const line = screen.getByText('Código: Tag.NotFound');
    expect(line).toHaveClass('mt-1');
    expect(line).toHaveClass('text-xs');
  });
});
