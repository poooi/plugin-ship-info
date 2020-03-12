//@ts-check

/** @type { import("eslint").Linter.Config } */
module.exports = {
    env: {
      browser: true,
      es6: true,
      node: true,
      jest: true,
    },
    extends: [
      'airbnb',
      'plugin:@typescript-eslint/recommended',
      'plugin:import/typescript',
      'poi-plugin',
      'prettier',
      'prettier/@typescript-eslint',
      'prettier/react',
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['import', 'react', 'prettier', '@typescript-eslint'],
    rules: {
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          ts: 'never',
          tsx: 'never',
          js: 'never',
          jsx: 'never',
        },
      ],
      '@typescript-eslint/camelcase': 'off',
      'react/jsx-filename-extension': 'off',
      'react/jsx-props-no-spreading': 'off',
      'react/destructuring-assignment': 'off',
      'import/prefer-default-export': 'off',
      'no-underscore-dangle': 'off',
      'react/state-in-constructor': 'off',
      '@typescript-eslint/interface-name-prefix': 'off', // FIXME: add this back after rework
      '@typescript-eslint/no-use-before-define': 'off', // FIXME: whitelist `window`
    },
  }
