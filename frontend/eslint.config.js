// ESLint 9 (configuración plana), como la plantilla de Vite 7 para React (SGDE-55).
// npm run lint revisa todo frontend/; el CI (lint-frontend) falla si hay errores.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // node_modules ya lo ignora ESLint por defecto.
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Con mayúscula inicial son componentes usados como etiqueta JSX (<Titulo>,
      // <Componente>), que no-unused-vars no ve. La plantilla lo hace con las
      // variables; aquí también con los parámetros (nivel: Titulo = "h2").
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Pantallas de más de 300 líneas: advertencia, no error. Las que hoy la superan
    // se parten en SGDE-97 (Clientes), SGDE-108 (Salones) y SGDE-103 (Home).
    files: ['**/*.jsx'],
    rules: {
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
])
