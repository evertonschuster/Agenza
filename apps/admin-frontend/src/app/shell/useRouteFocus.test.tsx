import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, Link, Outlet } from 'react-router';
import { useRouteFocus } from './useRouteFocus';

function Shell() {
  const ref = useRouteFocus<HTMLDivElement>();
  return (
    <div ref={ref} tabIndex={-1} data-testid="shell">
      <Link to="/two">to two</Link>
      <Outlet />
    </div>
  );
}

describe('useRouteFocus', () => {
  it('does not steal focus on the initial render', () => {
    render(
      <MemoryRouter initialEntries={['/one']}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/one" element={<div>one</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('shell')).not.toHaveFocus();
  });

  it('moves focus to the ref and scrolls the referenced element to top on a route change', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/one']}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/one" element={<div>one</div>} />
            <Route path="/two" element={<div>two</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // main is the actual overflow-y-auto container in AppShell — never the window — and it
    // persists across route changes (only the routed content under it swaps). Simulate that it
    // was scrolled before navigating.
    const shell = screen.getByTestId('shell');
    Object.defineProperty(shell, 'scrollTop', { value: 200, writable: true });
    Object.defineProperty(shell, 'scrollLeft', { value: 50, writable: true });

    await user.click(screen.getByRole('link', { name: 'to two' }));

    expect(shell).toHaveFocus();
    expect(shell.scrollTop).toBe(0);
    expect(shell.scrollLeft).toBe(0);
  });
});
