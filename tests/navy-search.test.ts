import { describe, expect, it } from 'vitest'

import {
  buildSearch,
  normalizeSearchText,
  readingToRomaji,
} from '../packages/navy-staff/src/views/search'

describe('ship search helper', () => {
  it('normalizes katakana/halfwidth/hiragana and case without transliterating Latin', () => {
    expect(normalizeSearchText('フブキ')).toBe('ふぶき')
    expect(normalizeSearchText('ﾌﾌﾞｷ')).toBe('ふぶき')
    expect(normalizeSearchText('Alpha')).toBe('alpha')
    // Romaji/Latin must stay intact so romaji queries are matchable.
    expect(normalizeSearchText('Kongou')).toBe('kongou')
  })

  it('matches kana, romaji, case, and reasonable typos', () => {
    const search = buildSearch([
      { id: 1, name: '吹雪', yomi: 'ふぶき', romaji: readingToRomaji('ふぶき'), identifiers: [1] },
      { id: 2, name: '金剛', yomi: 'こんごう', romaji: readingToRomaji('こんごう'), identifiers: [2] },
    ])

    expect(search('ふぶき').map((entry) => entry.id)).toEqual([1])
    expect(search('フブキ').map((entry) => entry.id)).toEqual([1])
    expect(search('fubuki').map((entry) => entry.id)).toEqual([1])
    expect(search('kongou').map((entry) => entry.id)).toEqual([2])
    // Typos in kana and romaji still find the reading.
    expect(search('こんぐ').map((entry) => entry.id)).toEqual([2])
    expect(search('kongu').map((entry) => entry.id)).toEqual([2])
  })

  it('uses exact identifier matching for numeric queries', () => {
    const search = buildSearch([
      { id: 10, name: 'A', identifiers: [10, 500], level: 99 },
    ])

    expect(search('#500').map((entry) => entry.id)).toEqual([10])
    expect(search('99').map((entry) => entry.id)).toEqual([10])
    // Exact, not a numeric substring of 500.
    expect(search('5').map((entry) => entry.id)).toEqual([])
  })

  it('matches visible aliases and localized type labels', () => {
    const search = buildSearch([
      { id: 1, name: 'Fubuki', aliases: ['吹雪'], type: 'DD', typeLabel: '驱逐' },
    ])
    expect(search('吹雪').map((entry) => entry.id)).toEqual([1])
    expect(search('驱逐').map((entry) => entry.id)).toEqual([1])
    expect(search('dd').map((entry) => entry.id)).toEqual([1])
  })
})
