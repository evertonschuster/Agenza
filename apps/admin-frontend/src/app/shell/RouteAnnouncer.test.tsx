import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router';
import { RouteAnnouncer } from './RouteAnnouncer';

function Shell() {
  return (
    <>
      <RouteAnnouncer />
      <Link to="/two">to two</Link>
      <Outlet />
    </>
  );
}

function renderShell() {
  const router = createMemoryRouter(
    [
      {
        element: <Shell />,
        children: [
          { path: '/one', element: <p>one</p>, handle: { title: 'Página Um' } },
          { path: '/two', element: <p>two</p>, handle: { title: 'Página Dois' } },
        ],
      },
    ],
    { initialEntries: ['/one'] },
  );

  return render(<RouterProvider router={router} />);
}

describe('RouteAnnouncer', () => {
  it('renders an empty polite live region on first mount (no double announcement with the page load)', () => {
    renderShell();

    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('announces the new route title after a navigation', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('link', { name: 'to two' }));

    expect(screen.getByRole('status')).toHaveTextContent('Página Dois');
  });
});
