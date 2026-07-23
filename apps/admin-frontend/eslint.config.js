import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'src/features/catalog/infrastructure/generated',
      'playwright-report',
      'test-results',
    ],
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      eslintConfigPrettier,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json', './tsconfig.e2e.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
      // A repository port's method signature is the interface contract
      // (e.g. every TagRepository method takes tenantContext structurally,
      // per admin-feature-vertical skill); a specific adapter - like an
      // HTTP one where the tenant travels in the JWT instead - may not
      // need to read that parameter. Leading underscore marks that
      // deliberately, distinct from a genuinely forgotten unused variable.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // domain/ has the strictest boundary: zero outward dependencies at all,
    // not even on application/ - domain is the innermost layer. Applies
    // inside every feature and in shared/ alike (ADR 009).
    files: ['src/features/*/domain/**/*.{ts,tsx}', 'src/shared/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom*',
                'react-router*',
                '**/application/*',
                '**/infrastructure/*',
                '**/presentation/*',
              ],
              message:
                'domain/ must have zero outward dependencies (Clean Architecture: dependencies point inward only).',
            },
          ],
        },
      ],
    },
  },
  {
    // application/ must stay framework-agnostic: no React, no router, and
    // it may not reach into infrastructure/ or presentation/ directly -
    // those depend on application via injected interfaces, not the reverse.
    files: ['src/features/*/application/**/*.{ts,tsx}', 'src/shared/application/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom*',
                'react-router*',
                '**/infrastructure/*',
                '**/presentation/*',
              ],
              message:
                'application/ must stay framework-agnostic and may not import infrastructure/ or presentation/ (Clean Architecture: dependencies point inward only).',
            },
          ],
        },
      ],
    },
  },
  {
    // presentation/ depends on application/ and domain/ but never reaches
    // into infrastructure/ directly - HTTP/OIDC/ProblemDetails details are
    // infrastructure's job; infrastructure converts its own errors to
    // AppError (shared/application/AppError.ts) before they ever reach a
    // component or hook (docs/adr/007). Presentation tests use hand-written
    // fakes for ports (e.g. src/test/fixtures/fakeSessionEventBus.ts)
    // instead of reaching for a concrete infrastructure implementation.
    // app/ (composition root's callers) follows the same rule, except
    // app/composition/ itself - that's the one place allowed to construct
    // concrete infrastructure (docs/adr/008).
    files: [
      'src/features/*/presentation/**/*.{ts,tsx}',
      'src/shared/presentation/**/*.{ts,tsx}',
      'src/app/**/*.{ts,tsx}',
    ],
    ignores: ['src/app/composition/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/*'],
              message:
                'presentation/ must not import infrastructure/ directly - infrastructure converts errors to AppError before they reach presentation (docs/adr/007). app/composition/container.ts is the sole exception (docs/adr/008).',
            },
          ],
        },
      ],
    },
  },
  {
    // Each feature's internals (domain/application/infrastructure/presentation)
    // are reached from outside the feature only through its own index.ts
    // public API (ADR 009) - never by importing past it into an internal
    // module. shared/ has no such boundary: it exists specifically to be
    // imported from anywhere.
    files: ['**/*.{ts,tsx}'],
    // src/test/** is recognized test infrastructure (MSW fixtures typed
    // against a feature's internal DTOs), not app/feature production code -
    // exempt like router.tsx's code-splitting exception below.
    ignores: ['src/features/auth/**/*.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/features/auth/domain/*',
                '**/features/auth/application/*',
                '**/features/auth/infrastructure/*',
                '**/features/auth/presentation/*',
              ],
              message:
                "Import the auth feature's public API (@/features/auth) instead of reaching into its internals (ADR 009).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/features/catalog/**/*.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/features/catalog/domain/*',
                '**/features/catalog/application/*',
                '**/features/catalog/infrastructure/*',
                '**/features/catalog/presentation/*',
              ],
              message:
                "Import the catalog feature's public API (@/features/catalog) instead of reaching into its internals (ADR 009).",
            },
          ],
        },
      ],
    },
  },
  {
    // shadcn/ui generates these files verbatim via its CLI and they're kept
    // exactly as generated (see feedback_shadcn_minimal_customization) -
    // explicit-function-return-type isn't part of shadcn's own style and
    // hand-editing dozens of generated components just to satisfy it would
    // be pure churn with no correctness benefit. Every other rule (type
    // safety, hooks, architectural boundaries) still applies here.
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/lib/utils.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      // shadcn's own convention exports a variants() helper (cva) alongside
      // the component (e.g. buttonVariants next to Button) - a non-component
      // export Fast Refresh can't cleanly hot-reload around, but changing
      // the generated file's export shape would drift it from the CLI
      // output this project deliberately stays close to (ADR 005).
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // A router configuration file - createBrowserRouter's routes array
    // references lazy-loaded page components, but the file's own export
    // (`router`) is a data structure, never a component. react-refresh's
    // rule doesn't apply to a file that never exports a component itself.
    files: ['src/app/routes/router.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
)
