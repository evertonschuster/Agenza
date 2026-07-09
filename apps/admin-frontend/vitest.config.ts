import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      // Without an explicit include, Vitest only measures files that are
      // imported by some test - untested files are invisible to the 80%
      // gate instead of counting against it.
      include: ['src/**'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 80,
      },
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.{ts,js}',
        // Pure wiring with no logic: main.tsx mounts App, App mounts the
        // route table. Route guards (ProtectedRoute) live in routes/ and
        // ARE tested - the route table itself is declarative config.
        '**/main.tsx',
        '**/App.tsx',
        'src/presentation/routes/router.tsx',
        // Stub pages awaiting their feature vertical (docs/STATUS.md).
        // Remove each line here when that vertical is implemented so its
        // real page counts toward the gate.
        'src/presentation/pages/AppointmentsPage/**',
        'src/presentation/pages/ClientsPage/**',
        'src/presentation/pages/DashboardPage/**',
        'src/presentation/pages/InboxPage/**',
        'src/presentation/pages/ServicesPage/**',
        'src/presentation/pages/SettingsPage/**',
      ],
    },
  },
})
