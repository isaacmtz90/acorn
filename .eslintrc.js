module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  env: {
    node: true,
    es2020: true
  },
  rules: {
    'no-unused-vars': 'off',
    'no-undef': 'off'
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js']
};