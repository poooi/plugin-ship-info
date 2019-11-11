module.exports = {
  '*.{css}': 'stylelint',
  '*.{ts,tsx}': ['tslint --fix', 'git add'],
}
