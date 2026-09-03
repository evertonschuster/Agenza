import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'src/shared/api/generated'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
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
      // Enforces FR-014's feature boundary mechanically: a feature's internals are only
      // reachable through its own barrel (e.g. "@/features/auth"), never by reaching past it
      // (e.g. "@/features/auth/AuthProvider"). Relative imports within a feature's own files
      // are untouched by this pattern.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*'],
              message:
                'Import from the feature\'s public API (e.g. "@/features/auth"), not its internals.',
            },
          ],
        },
      ],
    },
  },
  // Dependency direction (ARCHITECTURE.md §1): app -> features -> shared, never the reverse.
  // Flat-config note: `no-restricted-imports` in a later matching block REPLACES the base
  // definition for those files — it does not merge — so each block below restates every
  // pattern it needs.
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/features/*/*', '@/app/*'],
              message:
                '`shared/` is the bottom layer — it must not import from `@/features` or `@/app`.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*'],
              message:
                '`features/` must not import from `@/app` — the composition root depends on features, not the reverse.',
            },
            {
              group: ['@/features/*/*'],
              message:
                'Import from the feature\'s public API (e.g. "@/features/auth"), not its internals.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['*.config.{ts,js,mjs}', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
    ...tseslint.configs.disableTypeChecked,
  },
);
