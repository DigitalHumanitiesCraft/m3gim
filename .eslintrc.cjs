module.exports = {
  env: {
    browser: true,
    es2022: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  globals: {
    d3: 'readonly',
    lucide: 'readonly'
  },
  rules: {
    // Possible Errors
    'no-console': 'warn',
    'no-debugger': 'warn',

    // Best Practices
    'curly': ['error', 'multi-line'],
    'eqeqeq': ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',

    // Variables
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

    // Stylistic
    'indent': ['error', 2, { SwitchCase: 1 }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'no-trailing-spaces': 'error',
    'eol-last': ['error', 'always']
  }
};
