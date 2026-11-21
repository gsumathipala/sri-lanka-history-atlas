#!/usr/bin/env node
/** Export the atlas dataset as open data (GeoJSON, CSV, JSON) into dist-data/ and public/data/. */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const data = join(root, 'src', 'data')
const load = (p) => JSON.parse(readFileSync(join(data, p), 'utf8'))
const places = load('places.json')
const placeById = new Map(places.map((p) => [p.id, p]))
const events = readdirSync(join(data, 'events')).filter((f) => f.endsWith('.json')).sort().flatMap((f) => load(join('events', f)))
const sources = load('sources.json'), rulers = load('rulers.json'), relics = load('relics.json'), periods = load('periods.json'), regions = load('regions.json'), chronicles = load('chronicles.json'), tours = load('tours.json'), recon = load('reconstructions.json')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const meta = { name: 'Lanka Through Time dataset', version: pkg.version, generated: new Date().toISOString().slice(0, 10), licence: 'CC BY 4.0', note: 'Entries with review.status = "draft" have not been checked against their sources by a human reviewer.' }

const csvCell = (v) => { const s = v === undefined || v === null ? '' : Array.isArray(v) ? v.join('; ') : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const csv = (rows, cols) => [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n'

const placeFeatures = places.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { ...p, lat: undefined, lng: undefined } }))
const eventFeatures = events.flatMap((e) => e.placeIds.map((pid) => placeById.get(pid)).filter(Boolean).map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { eventId: e.id, title: e.title, start: e.start, end: e.end ?? null, dateLabel: e.dateLabel ?? null, category: e.category, confidence: e.confidence, placeId: p.id, review: e.review.status, sources: [...new Set(e.evidence.map((x) => x.sourceId))] } })))
const regionFeatures = regions.map((g) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: g.polygons.map((ring) => [...ring.map(([la, lo]) => [lo, la]), [ring[0][1], ring[0][0]]]) }, properties: { id: g.id, name: g.name, start: g.start, end: g.end, note: g.note, schematic: true } }))

for (const out of [join(root, 'dist-data'), join(root, 'public', 'data')]) {
  mkdirSync(out, { recursive: true })
  const w = (f, v) => writeFileSync(join(out, f), typeof v === 'string' ? v : JSON.stringify(v, null, 1))
  w('places.geojson', { type: 'FeatureCollection', metadata: meta, features: placeFeatures })
  w('events.geojson', { type: 'FeatureCollection', metadata: meta, features: eventFeatures })
  w('regions.geojson', { type: 'FeatureCollection', metadata: meta, features: regionFeatures })
  w('atlas.json', { metadata: meta, events, places, sources, rulers, relics, periods, regions, chronicles, tours, reconstructions: recon })
  w('events.csv', csv(events.map((e) => ({ ...e, placeIds: e.placeIds, sources: [...new Set(e.evidence.map((x) => x.sourceId))], review: e.review.status })), ['id', 'title', 'start', 'end', 'dateLabel', 'category', 'confidence', 'placeIds', 'sources', 'review', 'summary']))
  w('places.csv', csv(places, ['id', 'name', 'nameSi', 'nameTa', 'lat', 'lng', 'precision', 'kind', 'siteType', 'religion', 'founded', 'wikidata', 'coordSource']))
  w('rulers.csv', csv(rulers, ['id', 'name', 'start', 'end', 'role', 'polity', 'capitalPlaceId', 'geiger', 'dateNote']))
  w('sources.csv', csv(sources, ['id', 'authors', 'year', 'title', 'publication', 'publisher', 'kind', 'doi', 'url']))
}
console.log(`exported ${events.length} events, ${places.length} places, ${rulers.length} rulers, ${sources.length} sources -> dist-data/ and public/data/`)
