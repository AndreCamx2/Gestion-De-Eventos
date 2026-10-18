// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Pruebas de Jest (jest-expo): describe, it, expect, jest...
    files: ['**/__tests__/**/*.js', '**/*.test.js'],
    languageOptions: { globals: globals.jest },
  },
]);
