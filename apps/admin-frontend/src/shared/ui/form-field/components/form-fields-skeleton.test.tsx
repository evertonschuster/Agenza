import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { FormFieldsSkeleton } from './form-fields-skeleton';

describe('FormFieldsSkeleton', () => {
  it('marks the region as busy for assistive tech', () => {
    const { container } = render(<FormFieldsSkeleton fieldCount={3} />);

    expect(container.querySelector('[aria-busy="true"][aria-live="polite"]')).not.toBeNull();
  });

  it('renders two skeleton blocks (label + control) per field', () => {
    const { container } = render(<FormFieldsSkeleton fieldCount={3} />);

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(6);
  });
});
