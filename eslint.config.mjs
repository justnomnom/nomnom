import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** @param {string[]} patterns @param {import('eslint').Linter.FlatConfig[]} configs */
function scopeFiles(patterns, configs) {
  return configs.map((config) => ({ ...config, files: patterns }));
}

const appSourceFiles = ['src/**/*.{js,jsx}'];
const nodeToolingFiles = [
  'next.config.js',
  'postcss.config.js',
  'sentry.edge.config.js',
  'sentry.server.config.js',
  'eslint.config.mjs',
  'scripts/**/*.js',
  'scripts/**/*.mjs',
];

export default [
  {
    ignores: [
      '**/.cursor/**',
      '**/.git/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/out/**',
      '.agents/**',
      'build/**',
      'coverage/**',
      'dist/**',
      'public/**',
      'src/reportWebVitals.js',
      'src/reportWebVitals.ts',
      'src/service-worker.js',
      'src/service-worker.ts',
      'src/serviceWorkerRegistration.js',
      'src/serviceWorkerRegistration.ts',
      'src/setupTests.js',
      'src/setupTests.ts',
      'vite.config.js',
      'vite.config.ts',
    ],
  },

  ...scopeFiles(
    nodeToolingFiles,
    compat.config({
      env: { node: true },
      extends: ['airbnb-base', 'prettier'],
      parserOptions: {
        ecmaVersion: 'latest',
      },
      rules: {
        'arrow-body-style': 0,
        'import/no-extraneous-dependencies': 0,
        'import/prefer-default-export': 0,
        'no-console': 0,
        'no-continue': 0,
        'no-restricted-syntax': 0,
        'no-cond-assign': ['error', 'except-parens'],
      },
    })
  ),

  ...scopeFiles(
    appSourceFiles,
    compat.config({
      root: true,
      env: {
        browser: true,
        es2021: true,
      },
      plugins: ['perfectionist', 'unused-imports', 'prettier', '@next/next'],
      extends: [
        'airbnb',
        'airbnb/hooks',
        'prettier',
        'plugin:@next/next/recommended-legacy',
      ],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      settings: {
        react: {
          version: 'detect',
        },
        'import/resolver': {
          alias: {
            map: [['src', './src']],
            extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
          },
        },
      },
      rules: {
        'no-alert': 0,
        camelcase: 0,
        'no-console': 0,
        'no-param-reassign': 0,
        'naming-convention': 0,
        'default-param-last': 0,
        'no-underscore-dangle': 0,
        'no-use-before-define': 0,
        'no-restricted-exports': 0,
        'react/no-children-prop': 0,
        'react/forbid-prop-types': 0,
        'react/react-in-jsx-scope': 0,
        'jsx-a11y/anchor-is-valid': 0,
        'react/no-array-index-key': 0,
        'no-promise-executor-return': 0,
        'react/require-default-props': 0,
        'react/jsx-filename-extension': 0,
        'react/jsx-props-no-spreading': 0,
        'import/prefer-default-export': 0,
        // import/no-cycle can crash eslint-plugin-import when resolution returns null (e.g. route groups on Windows).
        'import/no-cycle': 0,
        'import/no-extraneous-dependencies': 0,
        'import/no-unresolved': [
          1,
          {
            ignore: ['^next/.*', '^react$', '^@tiptap/.*'],
          },
        ],
        'react/function-component-definition': 0,
        'jsx-a11y/control-has-associated-label': 0,
        'react/jsx-no-useless-fragment': [
          1,
          {
            allowExpressions: true,
          },
        ],
        'prefer-destructuring': [
          1,
          {
            object: true,
            array: false,
          },
        ],
        'react/no-unstable-nested-components': [
          1,
          {
            allowAsProps: true,
          },
        ],
        'no-unused-vars': [
          1,
          {
            args: 'none',
            varsIgnorePattern: '^_',
          },
        ],
        'no-plusplus': 0,
        'no-bitwise': 0,
        'no-nested-ternary': 1,
        'react/jsx-no-duplicate-props': [
          1,
          {
            ignoreCase: false,
          },
        ],
        '@next/next/no-html-link-for-pages': 'off',
        '@next/next/no-img-element': 'off',
        'unused-imports/no-unused-imports': 1,
        'unused-imports/no-unused-vars': [
          0,
          {
            vars: 'all',
            varsIgnorePattern: '^_',
            args: 'after-used',
            argsIgnorePattern: '^_',
          },
        ],
        'perfectionist/sort-named-imports': [
          1,
          {
            order: 'asc',
            type: 'line-length',
          },
        ],
        'perfectionist/sort-named-exports': [
          1,
          {
            order: 'asc',
            type: 'line-length',
          },
        ],
        'perfectionist/sort-exports': [
          1,
          {
            order: 'asc',
            type: 'line-length',
          },
        ],
        'perfectionist/sort-imports': [
          1,
          {
            order: 'asc',
            type: 'line-length',
            newlinesBetween: 'always',
            groups: [
              ['builtin', 'external'],
              'custom-mui',
              'custom-routes',
              'custom-hooks',
              'custom-utils',
              'internal',
              'custom-components',
              'custom-sections',
              'custom-types',
              ['parent', 'sibling', 'index'],
              'object',
              'unknown',
            ],
            customGroups: {
              value: {
                'custom-mui': '^@mui/',
                'custom-routes': '^src/routes/',
                'custom-hooks': '^src/hooks/',
                'custom-utils': '^src/utils/',
                'custom-components': '^src/components/',
                'custom-sections': '^src/sections/',
                'custom-types': '^src/types/',
              },
            },
            internalPattern: ['^src/'],
          },
        ],
      },
    })
  ),
];
