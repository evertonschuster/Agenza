import path from 'node:path';
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { layerBoundaries } from './eslint-rules/layerBoundaries.js';

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
    },
  },
  // Dependency direction (ARCHITECTURE.md §1) and the slice barrel (FR-014), checked on the path
  // each import resolves to, so a relative import cannot slip past what an alias import would hit.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      agenza: { rules: { 'layer-boundaries': layerBoundaries } },
    },
    rules: {
      'agenza/layer-boundaries': [
        'error',
        {
          srcDir: path.join(import.meta.dirname, 'src'),
          layers: ['app', 'features', 'widgets', 'shared'],
          slicedLayers: ['features'],
        },
      ],
    },
  },
  {
    files: ['*.config.{ts,js,mjs}', 'scripts/**/*.mjs', 'eslint-rules/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
    ...tseslint.configs.disableTypeChecked,
  },
);
