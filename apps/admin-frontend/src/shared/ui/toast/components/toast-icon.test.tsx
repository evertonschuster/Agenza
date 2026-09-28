import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ToastIcon } from './toast-icon';

describe('ToastIcon', () => {
  it.each([
    ['success', ['lucide-circle-check', 'text-success']],
    ['info', ['lucide-info']],
    ['warning', ['lucide-triangle-alert']],
    ['error', ['lucide-octagon-x', 'text-destructive']],
    ['loading', ['lucide-loader-circle', 'animate-spin']],
  ] as const)('renders the matching icon for type "%s"', (type, expectedClasses) => {
    const { container } = render(<ToastIcon type={type} />);
    expect(container.querySelector('svg')).toHaveClass(...expectedClasses);
  });

  it('hides the icon from assistive tech', () => {
    const { container } = render(<ToastIcon type="success" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders nothing for an unrecognized type', () => {
    const { container } = render(<ToastIcon type="bogus" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when type is undefined', () => {
    const { container } = render(<ToastIcon type={undefined} />);
    expect(container.firstChild).toBeNull();
  });
});
