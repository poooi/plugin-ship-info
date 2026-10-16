import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

// Module-boundary guards for the extraction. These read source text only (no
// implementation mirroring) and assert the dependency direction the split
// relies on.

const root = process.cwd()

const sourceFiles = (dir: string): string[] => {
  const out: string[] = []
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        out.push(full)
      }
    }
  }
  walk(path.join(root, dir))
  return out
}

const importSpecifiers = (source: string): string[] =>
  [...source.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((m) => m[1])

describe('architecture boundaries', () => {
  it('shared modules never depend on plugin-owned code, Electron, or capture', () => {
    for (const file of sourceFiles('shared')) {
      const source = fs.readFileSync(file, 'utf8')
      for (const spec of importSpecifiers(source)) {
        expect(spec, `${file} imports ${spec}`).not.toBe('electron')
        expect(spec, `${file} imports ${spec}`).not.toMatch(/html2canvas/)
        if (!spec.startsWith('.')) {
          // Host modules (`views/utils/selectors`, ...) are bare specifiers and
          // are the allowed integration boundary.
          continue
        }
        const resolved = path
          .relative(root, path.resolve(path.dirname(file), spec))
          .replace(/\\/g, '/')
        // A relative import must stay inside shared/; nothing may escape into
        // the plugin's views/.
        expect(resolved, `${file} imports ${spec} outside shared`).toMatch(
          /^shared\//,
        )
      }
    }
  })

  it('table pure utilities stay free of Electron and capture', () => {
    const source = fs.readFileSync(path.join(root, 'views/utils.ts'), 'utf8')
    for (const spec of importSpecifiers(source)) {
      expect(spec).not.toBe('electron')
      expect(spec).not.toMatch(/html2canvas/)
    }
  })
})
