import fs from 'node:fs'
import http from 'node:http'

// Tiny read-only npm registry for release-fixture tests. It serves an immutable
// packument per package name from a JSON file: { "<name>": { "<version>": true },
// "latest": { "<name>": "<version>" } }. No publishing happens; it only lets the
// installed pnpm resolve "published" versions while exercising native lanes.

const file = process.argv[2]
const requestedPort = Number(process.argv[3] ?? 0)

const server = http.createServer((req, res) => {
  const name = decodeURIComponent(
    (req.url ?? '/').replace(/^\//, '').split('/')[0],
  )
  let published = {}
  try {
    published = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    published = {}
  }
  const versions = published[name] ?? {}
  const versionsOut = {}
  for (const version of Object.keys(versions)) {
    versionsOut[version] = {
      name,
      version,
      dist: {
        integrity: 'sha512-xxxxxxxx',
        shasum: '0'.repeat(40),
        tarball: 'http://127.0.0.1/placeholder.tgz',
      },
    }
  }
  res.setHeader('content-type', 'application/json')
  res.setHeader('cache-control', 'no-store')
  res.end(
    JSON.stringify({
      name,
      versions: versionsOut,
      'dist-tags': {
        latest:
          published.latest?.[name] ?? Object.keys(versions)[0] ?? '0.0.0',
      },
    }),
  )
})

// Reject startup failures instead of hanging the test on a timeout.
server.on('error', () => process.exit(1))

server.listen(requestedPort, '127.0.0.1', () => {
  process.stdout.write(`ready ${server.address().port}\n`)
})
