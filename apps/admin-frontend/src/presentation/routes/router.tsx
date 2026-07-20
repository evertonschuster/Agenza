import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute } from './ProtectedRoute'
import { AdminLayout } from '../layouts/AdminLayout'
import { LoginPage } from '../pages/LoginPage/LoginPage'
import { CallbackPage } from '../pages/CallbackPage/CallbackPage'
import { DashboardPage } from '../pages/DashboardPage/DashboardPage'
import { AppointmentsPage } from '../pages/AppointmentsPage/AppointmentsPage'
import { ServicesPage } from '../pages/ServicesPage/ServicesPage'
import { ClientsPage } from '../pages/ClientsPage/ClientsPage'
import { InboxPage } from '../pages/InboxPage/InboxPage'
import { SettingsPage } from '../pages/SettingsPage/SettingsPage'
import { TagsPage } from '../pages/TagsPage/TagsPage'
import { CategoriesPage } from '../pages/CategoriesPage/CategoriesPage'

export const router = createBrowserRouter([
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
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'appointments', element: <AppointmentsPage /> },
          { path: 'services', element: <ServicesPage /> },
          { path: 'categories', element: <CategoriesPage /> },
          { path: 'clients', element: <ClientsPage /> },
          { path: 'inbox', element: <InboxPage /> },
          { path: 'tags', element: <TagsPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
])
