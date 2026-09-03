import './globals.css';
import { RouterProvider } from 'react-router';
import { AppProviders } from './AppProviders';
import { router } from './routes';
import { ErrorBoundary } from './ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  );
}
