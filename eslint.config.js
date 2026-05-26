import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'netlify/functions/**/*']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        // Required for the type-aware rules below to work.
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Two type-aware rules enabled as WARNINGS (not errors) to catch the
      // 'I awaited a promise but forgot await' class of bug — the same one
      // that produced 'I added a comment and it didn't publish'. Kept as
      // warnings because the codebase has many pre-existing instances; we
      // surface them without breaking CI. Flip to 'error' once cleaned up.
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': ['warn', {
        checksVoidReturn: { attributes: false },
      }],
    },
  },
])
