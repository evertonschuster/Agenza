import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, Link, Outlet } from 'react-router';
import { useRouteScrollReset } from './useRouteScrollReset';

function Shell() {
  const ref = useRouteScrollReset<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="shell">
      <Link to="/two">to two</Link>
      <Outlet />
    </div>
  );
}

describe('useRouteScrollReset', () => {
  it('scrolls the referenced element to top on a route change', async () => {
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
    // persists across route changes (only the routed content under it swaps).
    const shell = screen.getByTestId('shell');
    Object.defineProperty(shell, 'scrollTop', { value: 200, writable: true });
    Object.defineProperty(shell, 'scrollLeft', { value: 50, writable: true });

    await user.click(screen.getByRole('link', { name: 'to two' }));

    expect(shell.scrollTop).toBe(0);
    expect(shell.scrollLeft).toBe(0);
  });

  it('keeps the scroll position while navigation stays in the same section, like a dialog route opening and closing over its list', async () => {
    const user = userEvent.setup();

    function ListShell() {
      const ref = useRouteScrollReset<HTMLDivElement>();
      return (
        <div ref={ref} data-testid="shell">
          <Link to="/tags/1/edit">open dialog</Link>
          <Link to="/tags">close dialog</Link>
          <Outlet />
        </div>
      );
    }

    render(
      <MemoryRouter initialEntries={['/tags']}>
        <Routes>
          <Route element={<ListShell />}>
            <Route path="/tags" element={<Outlet />}>
              <Route path=":id/edit" element={<div>dialog</div>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const shell = screen.getByTestId('shell');
    Object.defineProperty(shell, 'scrollTop', { value: 200, writable: true });

    await user.click(screen.getByRole('link', { name: 'open dialog' }));
    expect(screen.getByText('dialog')).toBeInTheDocument();
    expect(shell.scrollTop).toBe(200);

    await user.click(screen.getByRole('link', { name: 'close dialog' }));
    expect(shell.scrollTop).toBe(200);
  });
});
