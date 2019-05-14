module.exports = {
  '*.{es,js}': ['eslint --fix', 'git add'],
  '*.{css}': 'stylelint',
  '*.{ts,tsx}': ['tslint --fix', 'git add'],
}
