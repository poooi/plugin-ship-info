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

const resolveRelative = (from: string, spec: string): string =>
  path.relative(root, path.resolve(path.dirname(from), spec)).replace(/\\/g, '/')

describe('architecture boundaries', () => {
  it('shared modules never depend on plugin-owned code, Electron, or capture', () => {
    for (const file of sourceFiles('packages/shared/src')) {
      const source = fs.readFileSync(file, 'utf8')
      for (const spec of importSpecifiers(source)) {
        expect(spec, `${file} imports ${spec}`).not.toBe('electron')
        expect(spec, `${file} imports ${spec}`).not.toMatch(/html2canvas/)
        if (!spec.startsWith('.')) {
          // Host modules (`views/utils/selectors`, ...) are bare specifiers and
          // are the allowed integration boundary.
          continue
        }
        // A relative import must stay inside the shared package.
        expect(
          resolveRelative(file, spec),
          `${file} imports ${spec} outside the shared package`,
        ).toMatch(/^packages\/shared\/src\//)
      }
    }
  })

  it('each plugin stays inside its own package and only imports shared by name', () => {
    for (const plugin of ['ship-info', 'navy-staff']) {
      const dir = `packages/${plugin}/src`
      for (const file of sourceFiles(dir)) {
        const source = fs.readFileSync(file, 'utf8')
        for (const spec of importSpecifiers(source)) {
          if (spec.startsWith('.')) {
            expect(
              resolveRelative(file, spec),
              `${file} imports ${spec} outside ${dir}`,
            ).toMatch(new RegExp(`^packages/${plugin}/src/`))
            continue
          }
          if (spec.startsWith('@poi-plugins/')) {
            expect(spec, `${file} imports ${spec}`).toMatch(
              /^@poi-plugins\/ship-info-shared\//,
            )
            continue
          }
          // No plugin may runtime-import the other plugin by package name.
          expect(spec, `${file} imports ${spec}`).not.toMatch(/^poi-plugin-/)
        }
      }
    }
  })

  it('shared host modules expose only implementations both consumers need', () => {
    for (const file of sourceFiles('packages/shared/src')) {
      const source = fs.readFileSync(file, 'utf8')
      expect(source, `${file} imports plugin config`).not.toMatch(
        /plugin\.(ShipInfo|NavyStaff)/,
      )
    }
  })
})
