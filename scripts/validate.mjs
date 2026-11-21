#!/usr/bin/env node
/**
 * Integrity checks for the atlas dataset. Runs before every build.
 * Fails (exit 1) on errors; prints warnings for things a reviewer should look at.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')
const load = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))

const sources = load('sources.json')
const places = load('places.json')
const periods = load('periods.json')
const rulers = load('rulers.json')
const chapters = load('chronicles.json')
const eventFiles = readdirSync(join(root, 'events')).filter((f) => f.endsWith('.json')).sort()
const events = eventFiles.flatMap((f) => load(join('events', f)).map((e) => ({ ...e, __file: f })))

const EVIDENCE = new Set(['archaeological', 'radiometric', 'epigraphic', 'chronicle', 'foreign-account', 'numismatic', 'architectural', 'archival', 'legal-official', 'scientific', 'contemporary-report', 'oral-tradition', 'synthesis'])
const CONF = new Set(['established', 'probable', 'traditional', 'contested', 'legendary'])
const CAT = new Set(['prehistory', 'polity', 'religion', 'conflict', 'economy', 'culture', 'foreign-contact', 'colonial', 'society', 'politics', 'disaster'])
const PRIMARY_TYPES = new Set(['archaeological', 'radiometric', 'epigraphic', 'chronicle', 'foreign-account', 'numismatic', 'architectural', 'archival', 'legal-official', 'scientific', 'contemporary-report'])
const MAX_YEAR = new Date().getFullYear()
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

const errors = []
const warnings = []
const err = (m) => errors.push(m)
const warn = (m) => warnings.push(m)

function uniq(list, label) {
  const seen = new Set()
  for (const x of list) {
    if (!ID_RE.test(x.id)) err(`${label} id not kebab-case: ${x.id}`)
    if (seen.has(x.id)) err(`duplicate ${label} id: ${x.id}`)
    seen.add(x.id)
  }
  return seen
}
const sourceIds = uniq(sources, 'source')
const placeIds = uniq(places, 'place')
uniq(periods, 'period')
uniq(events, 'event')

for (const s of sources) {
  for (const k of ['authors', 'year', 'title', 'kind']) if (!s[k]) err(`source ${s.id}: missing ${k}`)
}
for (const p of places) {
  if (p.lat < 5.7 || p.lat > 10.0 || p.lng < 79.4 || p.lng > 82.0) err(`place ${p.id}: coordinates outside Sri Lanka (${p.lat}, ${p.lng})`)
  if (!['exact', 'approximate', 'region'].includes(p.precision)) err(`place ${p.id}: bad precision`)
  if (p.siteType && !['stupa', 'monastery', 'temple', 'cave-temple', 'kovil', 'mosque', 'church', 'fort', 'palace', 'reservoir', 'sculpture', 'ruins', 'shrine'].includes(p.siteType)) err(`place ${p.id}: bad siteType ${p.siteType}`)
}
for (const p of periods) {
  if (p.start > p.end) err(`period ${p.id}: start after end`)
  for (const s of p.sourceIds) if (!sourceIds.has(s)) err(`period ${p.id}: unknown source ${s}`)
  if (p.capitalPlaceId && !placeIds.has(p.capitalPlaceId)) err(`period ${p.id}: unknown capital ${p.capitalPlaceId}`)
}

const cited = new Set()
const usedPlaces = new Set()
for (const e of events) {
  const at = `event ${e.id} (${e.__file})`
  for (const k of ['title', 'summary', 'category', 'confidence']) if (!e[k]) err(`${at}: missing ${k}`)
  if (typeof e.start !== 'number') err(`${at}: start must be a number`)
  if (e.start === 0 || e.end === 0) err(`${at}: there is no year 0 - use -1 (1 BCE) or 1 (1 CE)`)
  if (e.end !== undefined && e.end < e.start) err(`${at}: end before start`)
  if (e.start > MAX_YEAR) err(`${at}: start is in the future`)
  if (!CAT.has(e.category)) err(`${at}: unknown category ${e.category}`)
  if (!CONF.has(e.confidence)) err(`${at}: unknown confidence ${e.confidence}`)
  if (!e.placeIds?.length) err(`${at}: needs at least one placeId`)
  for (const p of e.placeIds ?? []) {
    if (!placeIds.has(p)) err(`${at}: unknown place ${p}`)
    usedPlaces.add(p)
  }
  if (!e.evidence?.length) err(`${at}: needs at least one evidence item`)
  for (const ev of e.evidence ?? []) {
    if (!EVIDENCE.has(ev.type)) err(`${at}: unknown evidence type ${ev.type}`)
    if (!sourceIds.has(ev.sourceId)) err(`${at}: unknown source ${ev.sourceId}`)
    if (!ev.description) err(`${at}: evidence missing description`)
    cited.add(ev.sourceId)
  }
  for (const pv of e.perspectives ?? []) {
    if (pv.sourceId && !sourceIds.has(pv.sourceId)) err(`${at}: perspective cites unknown source ${pv.sourceId}`)
    if (pv.sourceId) cited.add(pv.sourceId)
  }
  if (!e.review?.status) err(`${at}: missing review.status`)

  // Scholarly-quality warnings
  const primary = (e.evidence ?? []).filter((ev) => PRIMARY_TYPES.has(ev.type))
  if (!primary.length && e.confidence !== 'legendary') warn(`${at}: rests only on secondary synthesis - add primary evidence`)
  if (e.confidence === 'contested' && !e.historiography && !e.perspectives) warn(`${at}: contested but no historiography/perspectives`)
  if ((e.evidence ?? []).length < 2 && e.confidence === 'established') warn(`${at}: 'established' with a single evidence item`)
}
for (const s of periods.flatMap((p) => p.sourceIds)) cited.add(s)
// ---- chronicles, rulers, site stories, relics ----
const relics = load('relics.json')
const WORKS = new Set(['dipavamsa', 'mahavamsa', 'culavamsa', 'rajavaliya', 'yalpana-vaipava-malai'])
const chapterKeys = new Set(chapters.map((c) => `${c.work}:${c.chapter}`))
const RANGES = { dipavamsa: [1, 22], mahavamsa: [1, 37], culavamsa: [37, 101], rajavaliya: [1, 10], 'yalpana-vaipava-malai': [1, 9] }
function checkRefs(refs, at) {
  for (const r of refs ?? []) {
    if (!WORKS.has(r.work)) { err(`${at}: unknown chronicle ${r.work}`); continue }
    const rg = RANGES[r.work]
    if (r.chapter < rg[0] || r.chapter > rg[1]) err(`${at}: ${r.work} has no chapter ${r.chapter}`)
    else if (!chapterKeys.has(`${r.work}:${r.chapter}`)) warn(`${at}: ${r.work} ch. ${r.chapter} not in chapter index`)
  }
}
for (const e of events) checkRefs(e.chronicle, `event ${e.id}`)
for (const p of places) {
  checkRefs(p.chronicle, `place ${p.id}`)
  for (const st of p.stories ?? []) {
    checkRefs(st.chronicle, `place ${p.id} story "${st.title}"`)
    if (st.sourceId) {
      if (!sourceIds.has(st.sourceId)) err(`place ${p.id}: story cites unknown source ${st.sourceId}`)
      cited.add(st.sourceId)
    }
    if (!['chronicle', 'tradition', 'history', 'archaeology'].includes(st.basis)) err(`place ${p.id}: bad story basis`)
    if (st.basis === 'chronicle' && !st.chronicle?.length) err(`place ${p.id}: chronicle-based story "${st.title}" has no chronicle ref`)
  }
}
const ROLES = new Set(['king', 'queen', 'regent', 'sub-king', 'invader', 'foreign-sovereign', 'captain-general', 'governor', 'governor-general', 'prime-minister', 'president'])
uniq(rulers, 'ruler')
for (const r of rulers) {
  const at = `ruler ${r.id}`
  if (!ROLES.has(r.role)) err(`${at}: bad role ${r.role}`)
  if (r.end < r.start) err(`${at}: end before start`)
  if (r.capitalPlaceId && !placeIds.has(r.capitalPlaceId)) err(`${at}: unknown capital ${r.capitalPlaceId}`)
  checkRefs(r.chronicle, at)
}
const regions = load('regions.json')
uniq(regions, 'region')
for (const g of regions) for (const sid of g.sourceIds) { if (!sourceIds.has(sid)) err(`region ${g.id}: unknown source ${sid}`); cited.add(sid) }
const recon = load('reconstructions.json')
for (const r of recon) {
  if (!placeIds.has(r.placeId)) err(`reconstruction: unknown place ${r.placeId}`)
  for (const sid of r.sourceIds) { if (!sourceIds.has(sid)) err(`reconstruction ${r.placeId}: unknown source ${sid}`); cited.add(sid) }
  if (r.type !== 'pillar-hall' && !(r.diameter > 0 && r.height > 0)) err(`reconstruction ${r.placeId}: needs diameter and height`)
  if (r.model && !(r.model.credit && r.model.licence)) err(`reconstruction ${r.placeId}: 3D model needs credit and licence`)
}
uniq(relics, 'relic')
for (const r of relics) {
  for (const s of r.stations) {
    const at = `relic ${r.id} station ${s.placeId}`
    if (!placeIds.has(s.placeId)) err(`${at}: unknown place`)
    else usedPlaces.add(s.placeId)
    if (s.end !== undefined && s.end < s.start) err(`${at}: end before start`)
    if (s.sourceId) { if (!sourceIds.has(s.sourceId)) err(`${at}: unknown source`); cited.add(s.sourceId) }
    if (s.basis === 'chronicle' && !s.chronicle?.length) err(`${at}: chronicle basis without ref`)
    checkRefs(s.chronicle, at)
  }
}

for (const s of sources) if (!cited.has(s.id)) warn(`source ${s.id} is never cited`)
for (const p of places) if (!usedPlaces.has(p.id) && !p.importedFrom && !p.stories && !rulers.some((r) => r.capitalPlaceId === p.id) && !periods.some((x) => x.capitalPlaceId === p.id)) warn(`place ${p.id} is unused`)

const drafts = events.filter((e) => e.review?.status !== 'reviewed').length
const verbose = process.argv.includes('--verbose')
console.log(`Atlas data: ${relics.length} relics, ${events.length} events, ${places.length} places (${places.filter((p) => p.stories).length} with stories), ${rulers.length} rulers, ${chapters.length} chronicle chapters, ${sources.length} sources, ${periods.length} periods`)
console.log(`Review status: ${events.length - drafts} reviewed, ${drafts} draft`)
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s)${verbose ? ':' : ' (run with --verbose to list)'}`)
  if (verbose) for (const w of warnings) console.log('  ! ' + w)
}
if (errors.length) {
  console.error(`\n${errors.length} error(s):`)
  for (const e of errors) console.error('  x ' + e)
  process.exit(1)
}
console.log('\nOK')
