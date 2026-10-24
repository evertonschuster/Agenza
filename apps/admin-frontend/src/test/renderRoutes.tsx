import { render } from '@testing-library/react';
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
  useLocation,
  type RouteObject,
} from 'react-router';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

export function routerAt(routes: RouteObject[], initialEntries: string[]) {
  return <RouterProvider router={createMemoryRouter(routes, { initialEntries })} />;
}

export function renderRoutes(routes: RouteObject[], initialEntry: string) {
  return render(
    routerAt(
      [
        {
          element: (
            <>
              <Outlet />
              <LocationProbe />
            </>
          ),
          children: routes,
        },
      ],
      [initialEntry],
    ),
  );
}
