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
        'src/shared/ui/kbd/**',
        'src/shared/ui/label/**',
        'src/shared/ui/separator/**',
        'src/shared/ui/skeleton/**',
        'src/shared/ui/textarea/**',
        'src/shared/ui/FullScreenMessage/**',
        // Same reasoning: pure prop-driven renderers, no state or effects of their own.
        'src/shared/ui/list-section/**',
        'src/shared/ui/empty-state/**',
        'src/shared/ui/error-state/**',
        'src/shared/ui/link-button/**',
        'src/shared/ui/form-field/**',
        // No consumer anywhere yet (T160 in tasks.md) — 0% here is dead-code noise, not a gap.
        'src/shared/ui/dialog/**',
        // Real behaviour, but most of each file is shadcn scaffold with no product consumer yet
        // (submenus, checkbox items, chips, groups — see D5 in plan.md). The consumed subset is
        // exercised for real by ThemeToggle/CommandPalette/ShortcutHelpSheet tests; file-level
        // coverage can't separate that from the unused rest, so this gate is enforced by review,
        // not by the aggregate number. tooltip.tsx is deliberately not here: SidebarNav.test.tsx
        // and AppShell.test.tsx already exercise all of it for real.
        'src/shared/ui/dropdown-menu/**',
        'src/shared/ui/combobox/**',
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
