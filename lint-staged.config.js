module.exports = {
  '*.{css}': 'stylelint',
  '*.{ts,tsx}': ['eslint --fix', 'git add'],
}
