#!/usr/bin/env node
// Standalone acceptance measurement for Navy Staff long histories.
//
// This is NOT plugin runtime code and NOT a unit test. It builds a synthetic
// corpus that matches the version 2 durable serializer shape (full-state
// revisions, no pruning) and records serialized size plus JSON.stringify and
// real file-write latency on this environment. It writes only into a named
// temporary directory and removes it afterwards.
//
// Run with the repository's pinned Node:
//   node scripts/benchmark-navy-history.mjs

import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import process from 'node:process'

const NOW = '2026-01-01T00:00:00.000Z'

const area = (id, label, color, tagSlot) => ({
  capturedAt: NOW,
  color,
  fleetLabels: { 'en-US': `${label} Fleet` },
  id,
  label,
  tagSlot,
})

const shipRecord = (shipId) => ({
  level: 50 + (shipId % 125),
  masterId: shipId,
  name: `Synthetic Ship ${shipId}`,
  observedAt: NOW,
  ownedId: shipId,
  typeId: 2,
  typeLabel: 'DD',
})

const clone = (value) => JSON.parse(JSON.stringify(value))

// One workspace with two captured areas; the corpus adds `adds` ships to area-1
// and then performs `moves` moves between the two areas so the plan size stays
// fixed while revisions keep accumulating.
const buildHistory = (adds, moves) => {
  const areas = [
    area('area-1', 'E1', '#ffffff', 0),
    area('area-2', 'E2', '#000000', 1),
  ]
  let content = {
    areas,
    assignments: { 'area-1': [], 'area-2': [] },
    name: 'Synthetic plan',
    ships: {},
  }
  const revisions = [
    { content: clone(content), id: 'rev-0', op: { kind: 'initial' }, time: NOW },
  ]
  let cursor = 0

  const append = (op) => {
    cursor += 1
    revisions.push({ content: clone(content), id: `rev-${cursor}`, op, time: NOW })
  }

  for (let i = 0; i < adds; i += 1) {
    const shipId = i + 1
    content.assignments['area-1'] = [...content.assignments['area-1'], shipId]
    content.ships[String(shipId)] = shipRecord(shipId)
    append({ areaId: 'area-1', kind: 'add-ship', shipId })
  }
  for (let i = 0; i < moves; i += 1) {
    const shipId = (i % adds) + 1
    const from = content.assignments['area-1'].includes(shipId) ? 'area-1' : 'area-2'
    const to = from === 'area-1' ? 'area-2' : 'area-1'
    content.assignments[from] = content.assignments[from].filter((id) => id !== shipId)
    content.assignments[to] = [...content.assignments[to], shipId]
    append({ fromAreaId: from, kind: 'move-ship', shipId, toAreaId: to })
  }

  return {
    legacyArchive: { note: 'synthetic' },
    selectedWorkspaceId: 'ws-1',
    version: 2,
    workspaces: [
      {
        createdAt: NOW,
        cursor,
        id: 'ws-1',
        ownerMemberId: 'synthetic-owner',
        revisions,
      },
    ],
  }
}

const measure = (payload) => {
  const stringifyStart = performance.now()
  const json = JSON.stringify(payload)
  const stringifyMs = performance.now() - stringifyStart
  const bytes = Buffer.byteLength(json, 'utf8')

  const dir = mkdtempSync(join(tmpdir(), 'navy-history-bench-'))
  const file = join(dir, 'poi-plugin-navy-staff.json')
  const writeStart = performance.now()
  writeFileSync(file, json)
  const writeMs = performance.now() - writeStart
  unlinkSync(file)
  rmdirSync(dir)

  return { bytes, stringifyMs, writeMs }
}

const scenarios = [
  { label: '100-op / ~100-ship', adds: 100, moves: 0 },
  { label: '1000-op / 480-ship', adds: 480, moves: 520 },
]

console.log(
  `navy history benchmark (synthetic corpus, v2 serializer shape) — Node ${process.version}`,
)
for (const scenario of scenarios) {
  const payload = buildHistory(scenario.adds, scenario.moves)
  const revisions = payload.workspaces[0].revisions.length
  const result = measure(payload)
  console.log(
    `${scenario.label}: ${revisions} revisions, ${result.bytes} bytes, ` +
      `stringify ${result.stringifyMs.toFixed(1)} ms, write ${result.writeMs.toFixed(1)} ms`,
  )
}
