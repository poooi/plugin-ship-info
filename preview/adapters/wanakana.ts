// Host-provided wanakana boundary. The fixture yomi values are covered so
// romaji search behaves realistically without the native dependency.

const romajiMap: Record<string, string> = {
  アルファ: 'arufa',
  ベータ: 'beeta',
  ガンマ: 'ganma',
  デルタ: 'deruta',
  イプシロン: 'ipushiron',
}

export const toRomaji = (kana: string) => romajiMap[kana] ?? kana
