import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8' })

test('dataset validator passes (no integrity errors)', () => {
  const r = run('node', ['scripts/validate.mjs'])
  assert.equal(r.status, 0, r.stdout + r.stderr)
})
test('chronicle references: confirmed against the public-domain texts (regression guard)', () => {
  const r = run('python3', ['-I', 'scripts/verify-chronicle-refs.py'])
  assert.equal(r.status, 0, r.stderr)
  const m = r.stdout.match(/(\d+) confirmed, (\d+) not confirmed/)
  assert.ok(m, r.stdout)
  assert.ok(+m[1] >= 220, `confirmed ${m[1]}`)
  assert.ok(+m[2] <= 12, `unconfirmed ${m[2]} - check new refs against the texts`)
})
test('open-data export: GeoJSON and CSV are consistent with the dataset', () => {
  const r = run('node', ['scripts/export-dataset.mjs'])
  assert.equal(r.status, 0, r.stderr)
  const places = JSON.parse(readFileSync('src/data/places.json', 'utf8'))
  const gj = JSON.parse(readFileSync('dist-data/places.geojson', 'utf8'))
  assert.equal(gj.features.length, places.length)
  for (const f of gj.features) {
    const [lng, lat] = f.geometry.coordinates
    assert.ok(lat > 5.7 && lat < 10 && lng > 79.4 && lng < 82, f.properties.id)
  }
  const csv = readFileSync('dist-data/events.csv', 'utf8').trim().split('\n')
  assert.ok(csv.length > 100)
})
test('every Dipavamsa verse range cited in the data exists in the text', () => {
  const files = ['01-prehistory', '02-anuradhapura', '03-medieval', '04-colonial', '05-modern']
  const evs = files.flatMap((f) => JSON.parse(readFileSync(`src/data/events/${f}.json`, 'utf8')))
  for (const e of evs)
    for (const r of e.chronicle ?? [])
      if (r.work === 'dipavamsa' && r.verses) {
        const nums = JSON.parse(readFileSync(`public/texts/dipavamsa/${r.chapter}.json`, 'utf8')).verses.map((v) => v.n)
        for (const n of r.verses.split('-').map(Number)) assert.ok(nums.includes(n), `${e.id}: D${r.chapter}.${n}`)
      }
})
