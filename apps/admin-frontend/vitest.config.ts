import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      cn: path.resolve(import.meta.dirname, './src/shared/lib/utils.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:5173',
      },
    },
    globals: true,
    setupFiles: ['./src/vitest-setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**'],
      exclude: [
        'src/main.tsx',
        'src/app/App.tsx',
        'src/app/routes.tsx',
        'src/app/shell/ProtectedAppShell.tsx',
        'src/shared/api/generated/**',
        // Presentational cva wrappers with no logic of their own — see D5 in plan.md.
        'src/shared/ui/avatar/**',
        'src/shared/ui/badge/**',
        'src/shared/ui/button/**',
        'src/shared/ui/card/**',
        'src/shared/ui/input/**',
        'src/shared/ui/label/**',
        'src/shared/ui/separator/**',
        'src/shared/ui/skeleton/**',
        'src/shared/ui/textarea/**',
        'src/shared/ui/FullScreenMessage/**',
        // Same reasoning: pure prop-driven renderers, no state or effects of their own.
        'src/widgets/list-section/**',
        'src/shared/ui/empty-state/**',
        'src/shared/ui/error-state/**',
        'src/shared/ui/form-field/**',
        'src/shared/form/fields/**',
        // Real behaviour, but these files still include unconsumed shadcn subcomponents
        // (submenus, checkbox/radio items and extra sheet/toast parts — see D5 in plan.md).
        // File coverage cannot separate those from the parts exercised by app callers.
        // Combobox and tooltip stay in the gate because their current code has real consumers.
        'src/shared/ui/dropdown-menu/**',
        'src/shared/ui/sheet/**',
        'src/shared/ui/toast/**',
        'src/vite-env.d.ts',
        'src/vitest-setup.ts',
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/features/*/index.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
});
