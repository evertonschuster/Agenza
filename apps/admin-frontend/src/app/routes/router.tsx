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
  import('@/features/catalog/presentation/services/ServicesPage').then(m => ({
    default: m.ServicesPage,
  })),
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
const TagsPage = lazy(() =>
  import('@/features/catalog/presentation/tags/TagsPage').then(m => ({ default: m.TagsPage })),
)
const CategoriesPage = lazy(() =>
  import('@/features/catalog/presentation/categories/CategoriesPage').then(m => ({
    default: m.CategoriesPage,
  })),
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
              { path: 'services', element: withSuspense(<ServicesPage />) },
              { path: 'categories', element: withSuspense(<CategoriesPage />) },
              { path: 'clients', element: withSuspense(<ClientsPage />) },
              { path: 'inbox', element: withSuspense(<InboxPage />) },
              { path: 'tags', element: withSuspense(<TagsPage />) },
              { path: 'settings', element: withSuspense(<SettingsPage />) },
            ],
          },
        ],
      },
    ],
  },
])
