const jsExtensions = ['.js', '.es']
const tsExtensions = ['.ts', '.tsx', '*.d.ts']
const allExtensions = jsExtensions.concat(tsExtensions)

module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    'airbnb',
    'poi-plugin',
    'prettier',
    'prettier/react',
  ],
  settings: {
    'import/extensions': allExtensions,
    'import/parsers': {
      '@typescript-eslint/parser': tsExtensions,
    },
    'import/resolver': {
      node: {
        extensions: allExtensions,
      },
    },
  },
  parser: 'babel-eslint',
  plugins: ['import', 'react', 'prettier'],
  rules: {
    'import/no-unresolved': [2, { ignore: ['views/.*'] }],
    'react/jsx-filename-extension': 'off',
    'no-underscore-dangle': ['error', { allow: ['__'], allowAfterThis: true }],
    'import/extensions': ['error', { es: 'never' }],
    'import/no-extraneous-dependencies': 'off',
    camelcase: 'off',
    'no-confusing-arrow': 'off',
    'react/require-default-props': 'off',
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'function-paren-newline': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/anchor-is-valid': 'off',
    'prettier/prettier': 'error',
    'react/no-access-state-in-setstate': 'off', // FIXME: add back this rule
    'react/destructuring-assignment': 'off',
    'import/prefer-default-export': 'off',
  },
}
