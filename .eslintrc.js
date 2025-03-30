module.exports = {
  env: {
    browser: true,
    es2023: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  globals: {
    Log: 'readonly',
    Module: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 'latest',
  },
  root: true,
  rules: {},
};
