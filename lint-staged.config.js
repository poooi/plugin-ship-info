module.exports = {
  linters: {
    '*.{es,js}': ['eslint --fix', 'git add'],
    '*.{css}': 'stylelint',
    '*.{ts,tsx}': ['tslint --fix', 'git add'],
  },
  ignore: ['shims/**/*.d.ts'],
}
