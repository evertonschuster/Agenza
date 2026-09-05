import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, Link } from 'react-router';
import { useRouteFocus } from './useRouteFocus';

function Page({ label }: { label: string }) {
  const ref = useRouteFocus<HTMLDivElement>();
  return (
    <div ref={ref} tabIndex={-1} data-testid={`page-${label}`}>
      <Link to="/two">to two</Link>
      {label}
    </div>
  );
}

describe('useRouteFocus', () => {
  it('does not steal focus on the initial render', () => {
    render(
      <MemoryRouter initialEntries={['/one']}>
        <Routes>
          <Route path="/one" element={<Page label="one" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('page-one')).not.toHaveFocus();
  });

  it('moves focus to the ref and scrolls to top on a route change', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/one']}>
        <Routes>
          <Route path="/one" element={<Page label="one" />} />
          <Route path="/two" element={<Page label="two" />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('link', { name: 'to two' }));

    expect(screen.getByTestId('page-two')).toHaveFocus();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
