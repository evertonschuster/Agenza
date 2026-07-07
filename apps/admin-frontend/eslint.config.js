import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist'] },
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
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
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
    },
  },
  {
    // application/ must stay framework-agnostic: no React, no router, and
    // it may not reach into infrastructure/ or presentation/ directly -
    // those depend on application via injected interfaces, not the reverse.
    files: ['src/application/**/*.{ts,tsx}'],
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
    // domain/ has the strictest boundary: zero outward dependencies at all,
    // not even on application/ - domain is the innermost layer.
    files: ['src/domain/**/*.{ts,tsx}'],
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
)
