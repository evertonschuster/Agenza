import { lazy, Suspense, type ReactElement } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute, LoginPage, CallbackPage } from '@/features/auth'
import { RouteErrorElement } from '@/app/routes/RouteErrorElement'
import { AdminLayout } from '@/app/layouts/AdminLayout'
import { FullScreenSpinner } from '@/shared/presentation/components/FullScreenSpinner'

// LoginPage/CallbackPage stay eager - they're needed before/during auth
// resolution. Every other page is lazy so `vite build` gives each route
// its own chunk instead of one large bundle loaded up front.
const DashboardPage = lazy(() =>
  import('@/app/pages/DashboardPage/DashboardPage').then(m => ({ default: m.DashboardPage })),
)
const AppointmentsPage = lazy(() =>
  import('@/app/pages/AppointmentsPage/AppointmentsPage').then(m => ({
    default: m.AppointmentsPage,
  })),
)
const ServicesPage = lazy(() =>
  import('@/app/pages/ServicesPage/ServicesPage').then(m => ({ default: m.ServicesPage })),
)
const ClientsPage = lazy(() =>
  import('@/app/pages/ClientsPage/ClientsPage').then(m => ({ default: m.ClientsPage })),
)
const InboxPage = lazy(() =>
  import('@/app/pages/InboxPage/InboxPage').then(m => ({ default: m.InboxPage })),
)
const SettingsPage = lazy(() =>
  import('@/app/pages/SettingsPage/SettingsPage').then(m => ({ default: m.SettingsPage })),
)
const CategoriesListPage = lazy(() =>
  import('@/features/catalog/presentation/categories/pages/CategoriesListPage/CategoriesListPage').then(
    m => ({ default: m.CategoriesListPage }),
  ),
)
const CategoryEditorDialog = lazy(() =>
  import(
    '@/features/catalog/presentation/categories/pages/CategoryEditorDialog/CategoryEditorDialog'
  ).then(m => ({ default: m.CategoryEditorDialog })),
)
function withSuspense(element: ReactElement): ReactElement {
  return <Suspense fallback={<FullScreenSpinner />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    // No path/element of its own - a pure grouping route so every route
    // below shares one errorElement (a thrown loader, an unmatched path,
    // or a lazy route's chunk failing to load) without adding a layout.
    errorElement: <RouteErrorElement />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/callback',
        element: <CallbackPage />,
      },
      {
        // All routes inside here require an authenticated session.
        // ProtectedRoute reads useAuth and redirects to /login if needed.
        element: <ProtectedRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              { path: 'dashboard', element: withSuspense(<DashboardPage />) },
              { path: 'appointments', element: withSuspense(<AppointmentsPage />) },
              {
                path: 'categories',
                element: withSuspense(<CategoriesListPage />),
                children: [
                  { path: 'new', element: withSuspense(<CategoryEditorDialog />) },
                  { path: ':id/edit', element: withSuspense(<CategoryEditorDialog />) },
                ],
              },
              { path: 'clients', element: withSuspense(<ClientsPage />) },
              { path: 'inbox', element: withSuspense(<InboxPage />) },
              { path: 'services', element: withSuspense(<ServicesPage />) },
              { path: 'settings', element: withSuspense(<SettingsPage />) },
            ],
          },
        ],
      },
    ],
  },
])
