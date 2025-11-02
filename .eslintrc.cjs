module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'react-hooks', '@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-refresh/recommended',
    'prettier',
  ],
  env: { browser: true, node: true, es2022: true },
  settings: { react: { version: '18.0' } },
  ignorePatterns: ['dist', 'node_modules'],
};

