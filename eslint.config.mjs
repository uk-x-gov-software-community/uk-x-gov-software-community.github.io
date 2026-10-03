import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    ignores: ['node_modules/', 'coverage/']
  },
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.node
    },
    rules: {
      ...js.configs.recommended.rules
    }
  }
]
