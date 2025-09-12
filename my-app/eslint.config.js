import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';

export default [
  // Base JavaScript configuration
  js.configs.recommended,

  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'dist/**',
      '.expo/**',
      '.expo-shared/**',
      'web-build/**',
      'ios/**',
      'android/**',
      '.cache/**',
      '.parcel-cache/**',
      '.next/**',
      'coverage/**',
      '.nyc_output/**',
      'jspm_packages/**',
      '*.generated.*',
      '.vscode/**',
      '.idea/**',
      '*.swp',
      '*.swo',
      '*.tmp',
      '*.temp',
      '*.jsbundle',
      '.metro-health-check*',
      '.DS_Store',
      'Thumbs.db',
    ],
  },

  // Configuration for JavaScript files
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        __DEV__: 'readonly',
        console: 'readonly',
        process: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        NodeJS: 'readonly',
        React: 'readonly',
        JSX: 'readonly',
        alert: 'readonly',
        fetch: 'readonly',
        RequestInfo: 'readonly',
        RequestInit: 'readonly',
        Response: 'readonly',
        AbortController: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        require: 'readonly',
        FlatList: 'readonly',
        URLSearchParams: 'readonly',
        ALLOWED_HIKING_SPOTS: 'readonly',
      },
    },
    rules: {
      // General JavaScript rules
      'no-console': 'off',
      'no-debugger': 'error',
      'no-unused-vars': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],

      // Code style rules
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'object-curly-spacing': ['error', 'always'],
      'space-before-blocks': 'error',
      'keyword-spacing': 'error',
    },
  },

  // Configuration for TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        __DEV__: 'readonly',
        console: 'readonly',
        process: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        NodeJS: 'readonly',
        React: 'readonly',
        JSX: 'readonly',
        alert: 'readonly',
        fetch: 'readonly',
        RequestInfo: 'readonly',
        RequestInit: 'readonly',
        Response: 'readonly',
        AbortController: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        require: 'readonly',
        FlatList: 'readonly',
        URLSearchParams: 'readonly',
        ALLOWED_HIKING_SPOTS: 'readonly',
      },
    },
    rules: {
      // General TypeScript rules
      'no-console': 'off',
      'no-debugger': 'error',
      'no-unused-vars': 'off', // TypeScript handles this
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],

      // Code style rules
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'object-curly-spacing': ['error', 'always'],
      'space-before-blocks': 'error',
      'keyword-spacing': 'error',
    },
  },

  // Node.js configuration files
  {
    files: [
      '**/*.cjs',
      '.prettierrc.js',
      'babel.config.cjs',
      'metro.config.cjs',
    ],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',
      globals: {
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
        console: 'readonly',
        process: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
    },
  },
];
