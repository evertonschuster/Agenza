import { fileURLToPath } from 'node:url'
import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // e2e/ holds Playwright specs (own test runner, own `test`/`expect`
    // globals from @playwright/test) - without this, Vitest's default
    // *.spec.ts include pattern would also try to run them as Vitest
    // tests and fail immediately on the missing vitest globals.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      // Without an explicit include, Vitest only measures files that are
      // imported by some test - untested files are invisible to the 80%
      // gate instead of counting against it.
      include: ['src/**'],
      reporter: ['text', 'html', 'lcov'],
      // Raised from the original lines-only 80% gate now that
      // statements/branches/functions are all comfortably above these
      // numbers in practice (~91/91/85/85 as of docs/adr/011) - never
      // lower `lines` below its previous value.
      thresholds: {
        lines: 85,
        statements: 85,
        branches: 80,
        functions: 80,
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
        'src/app/routes/router.tsx',
        // Stub pages awaiting their feature vertical (docs/STATUS.md).
        // Remove each line here when that vertical is implemented so its
        // real page counts toward the gate.
        'src/app/pages/AppointmentsPage/**',
        'src/app/pages/ClientsPage/**',
        'src/app/pages/DashboardPage/**',
        'src/app/pages/InboxPage/**',
        'src/app/pages/SettingsPage/**',
      ],
    },
  },
})
