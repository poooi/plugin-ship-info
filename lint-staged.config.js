module.exports = {
  linters: {
    '*.{css}': 'stylelint',
    '*.{ts,tsx}': ['tslint --fix', 'git add'],
  },
  ignore: ['shims/**/*.d.ts'],
}
