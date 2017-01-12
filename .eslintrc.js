module.exports = {
  'env': {
    'browser': true,
    'es6': true,
    'node': true,
  },
  'extends': [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    "airbnb-base",
  ],
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    }
  },
  'installedESLint': true,
  'parser': 'babel-eslint',
  'plugins': [
    'import',
    'react',
  ],
  'globals': {
    'html2canvas': false,
    "window": true,
    "config": true,
  },
  'rules': {
    'comma-dangle': ['error', 'always-multiline'],
    'indent': ['warn', 2],
    'linebreak-style': ['error', 'unix'],
    'no-console': ['warn', {'allow': ['warn', 'error']}],
    'no-var': 'error',
    'no-unused-vars': ['warn', {'args': 'none'}],
    'semi': ['error', 'never'],
    'unicode-bom': 'error',
    'react/prop-types': 'off',
    'import/no-unresolved': [2, { ignore: ['views/.*'] }],
    "react/jsx-indent": [1, 2],
    "react/jsx-indent-props": [1, 2],
    "react/jsx-closing-bracket-location": [1, 'tag-aligned'],
    "comma-spacing": ["error", { "before": false, "after": true }],
    'import/extensions': 'off',
    'import/no-extraneous-dependencies': 'off',
    'eqeqeq': 'off',
    'default-case': 'off',
    'consistent-return': 'off',
    'no-underscore-dangle': 'off',
    'camelcase': 'off',
    'object-shorthand': 'off',
    'arrow-body-style': 'off',
    'radix': 'warn',
    'no-return-assign': 'off',
    'no-trailing-spaces': ["error", { "skipBlankLines": true }],
  },
  'settings': {
    'import/resolver': {
      'node': {
        'extensions': ['.js', '.jsx', '.es', '.coffee', '.cjsx'],
        'paths': [__dirname],
      },
    },
    'import/core-modules': [
      'electron',
      'react',
      'react-dom',
      'react-redux',
      'redux-observers',
      'reselect',
      'react-bootstrap',
      'react-fontawesome',
      'path-extra',
      'fs-extra',
      'lodash',
      'cson',
      'fast-memoize',
      'classnames',
      'i18n-2',
      'semver'
    ],
  },
}
