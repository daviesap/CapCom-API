// functions/eslint.config.js
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,   // <-- gives you process, __dirname, etc.
      },
    },
    rules: {
      // your extra rules here if needed
    },
  },
];