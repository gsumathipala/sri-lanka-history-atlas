import { tr, type StrKey } from './i18n'
import type { Category, ChronicleChapter, ChronicleRef, ChronicleWork, Confidence, EvidenceType, HistEvent, Period, Place, Reconstruction, Region, Relic, Ruler, RulerRole, Source } from '../types'
import sourcesJson from '../data/sources.json'
import placesJson from '../data/places.json'
import periodsJson from '../data/periods.json'
import rulersJson from '../data/rulers.json'
import chaptersJson from '../data/chronicles.json'
import relicsJson from '../data/relics.json'
import regionsJson from '../data/regions.json'
import reconJson from '../data/reconstructions.json'

const eventModules = import.meta.glob<HistEvent[]>('../data/events/*.json', { eager: true, import: 'default' })

export const sources = sourcesJson as Source[]
export const places = placesJson as Place[]
export const periods = periodsJson as Period[]
export const events: HistEvent[] = Object.keys(eventModules)
  .sort()
  .flatMap((k) => eventModules[k])
  .sort((a, b) => a.start - b.start)

export const sourceById = new Map(sources.map((s) => [s.id, s]))
export const placeById = new Map(places.map((p) => [p.id, p]))
export const eventById = new Map(events.map((e) => [e.id, e]))

export const eventsByPlace = new Map<string, HistEvent[]>()
for (const e of events) for (const p of e.placeIds) eventsByPlace.set(p, [...(eventsByPlace.get(p) ?? []), e])

export const eventsBySource = new Map<string, HistEvent[]>()
for (const e of events) {
  const ids = new Set([...e.evidence.map((x) => x.sourceId), ...(e.perspectives ?? []).flatMap((x) => (x.sourceId ? [x.sourceId] : []))])
  for (const s of ids) eventsBySource.set(s, [...(eventsBySource.get(s) ?? []), e])
}

export const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  prehistory: { label: 'Prehistory', color: '#8d6e63' },
  polity: { label: 'States & kingship', color: '#c2185b' },
  religion: { label: 'Religion', color: '#f9a825' },
  conflict: { label: 'Conflict', color: '#d32f2f' },
  economy: { label: 'Economy & irrigation', color: '#2e7d32' },
  culture: { label: 'Culture & writing', color: '#7b1fa2' },
  'foreign-contact': { label: 'Foreign contact', color: '#0288d1' },
  colonial: { label: 'Colonial rule', color: '#5d4037' },
  society: { label: 'Society', color: '#00897b' },
  politics: { label: 'Modern politics', color: '#3949ab' },
  disaster: { label: 'Disaster & epidemic', color: '#455a64' },
}

export const CONFIDENCE_META: Record<Confidence, { label: string; description: string }> = {
  established: { label: 'Established', description: 'Multiple independent lines of evidence agree.' },
  probable: { label: 'Probable', description: 'Good evidence, with uncertainty in detail or date.' },
  traditional: { label: 'Traditional', description: 'Rests mainly on chronicle tradition; limited independent corroboration.' },
  contested: { label: 'Contested', description: 'Scholars actively disagree on facts, dating or interpretation.' },
  legendary: { label: 'Legendary', description: 'Mythic or religious tradition without historical corroboration.' },
}

export const EVIDENCE_META: Record<EvidenceType, { label: string; icon: string }> = {
  archaeological: { label: 'Archaeological', icon: '⛏' },
  radiometric: { label: 'Radiometric dating', icon: '☢' },
  epigraphic: { label: 'Inscription', icon: '𑀅' },
  chronicle: { label: 'Chronicle', icon: '📜' },
  'foreign-account': { label: 'Foreign account', icon: '🧭' },
  numismatic: { label: 'Coins', icon: '◎' },
  architectural: { label: 'Monument', icon: '🏛' },
  archival: { label: 'Archive', icon: '🗄' },
  'legal-official': { label: 'Official document', icon: '§' },
  scientific: { label: 'Scientific analysis', icon: '🔬' },
  'contemporary-report': { label: 'Contemporary report', icon: '📰' },
  'oral-tradition': { label: 'Oral tradition', icon: '🗣' },
  synthesis: { label: 'Scholarly synthesis', icon: '📚' },
}

export function citation(s: Source): string {
  const parts = [`${s.authors} (${s.year}).`, `${s.title}.`]
  if (s.publication) parts.push(`${s.publication}.`)
  if (s.publisher) parts.push(`${s.publisher}.`)
  return parts.join(' ')
}

// ---------- rulers ----------
export const rulers = (rulersJson as Ruler[]).slice().sort((a, b) => a.start - b.start)
export const rulerById = new Map(rulers.map((r) => [r.id, r]))

export const POLITY_META: Record<string, { label: string; color: string; order: number }> = {
  anuradhapura: { label: 'Anuradhapura', color: '#c97b3c', order: 1 },
  chola: { label: 'Chola overlords', color: '#b5533c', order: 2 },
  ruhuna: { label: 'Ruhuna', color: '#d4a24c', order: 3 },
  polonnaruwa: { label: 'Polonnaruwa', color: '#b99c3a', order: 4 },
  dambadeniya: { label: 'Dambadeniya / Yapahuwa / Kurunegala', color: '#8aa04a', order: 5 },
  gampola: { label: 'Gampola', color: '#4f9a80', order: 6 },
  kotte: { label: 'Kotte', color: '#3f8c95', order: 7 },
  sitawaka: { label: 'Sitawaka', color: '#7f6aa0', order: 8 },
  kandy: { label: 'Kandy', color: '#9a5f8a', order: 9 },
  jaffna: { label: 'Jaffna', color: '#a05f5f', order: 10 },
  portuguese: { label: 'Portuguese Ceylon', color: '#2e7d6b', order: 11 },
  dutch: { label: 'Dutch Ceylon (VOC)', color: '#d17a22', order: 12 },
  british: { label: 'British Ceylon', color: '#a33b3b', order: 13 },
  dominion: { label: 'Dominion of Ceylon', color: '#5b6fa8', order: 14 },
  republic: { label: 'Republic of Sri Lanka', color: '#4a4f8c', order: 15 },
}

export const ROLE_LABEL: Record<RulerRole, string> = {
  king: 'King',
  queen: 'Queen',
  regent: 'Regent / interregnum',
  'sub-king': 'Sub-king / viceroy',
  invader: 'Invader / usurper',
  'foreign-sovereign': 'Foreign sovereign',
  'captain-general': 'Captain-General',
  governor: 'Governor',
  'governor-general': 'Governor-General',
  'prime-minister': 'Prime Minister',
  president: 'President',
}

export const rulersAt = (year: number) => rulers.filter((r) => r.start <= year && r.end >= Math.floor(year) && r.role !== 'prime-minister')

// ---------- chronicles ----------
export const chapters = chaptersJson as ChronicleChapter[]
export const CHRONICLE_META: Record<ChronicleWork, { label: string; sourceId?: string; span: string; description: string }> = {
  dipavamsa: { label: 'Dipavamsa', sourceId: 'oldenberg1879', span: 'chs. 1-22, to Mahasena', description: 'The earliest Sri Lankan chronicle (c. 4th c. CE), in Pali verse.' },
  mahavamsa: { label: 'Mahavamsa', sourceId: 'geiger1912', span: 'chs. 1-37 (v. 50), to Mahasena', description: 'The "Great Chronicle" (c. 5th-6th c. CE), attributed to the monk Mahanama of the Mahavihara.' },
  culavamsa: { label: 'Culavamsa', sourceId: 'geiger1929', span: 'chs. 37 (v. 51)-101, to 1815', description: 'The continuation of the Mahavamsa, written in several stages between the 13th and 19th centuries.' },
  rajavaliya: { label: 'Rajavaliya', sourceId: 'suraweera2000', span: 'to the 17th-18th c.', description: 'Sinhala prose chronicle of the kings.' },
  'yalpana-vaipava-malai': { label: 'Yalpana Vaipava Malai', sourceId: 'brito1879', span: 'to the 18th c.', description: 'Tamil chronicle of the Jaffna kingdom (c. 1736).' },
}
export const chapterKey = (r: { work: ChronicleWork; chapter: number }) => `${r.work}:${r.chapter}`
export const chapterByKey = new Map(chapters.map((c) => [chapterKey(c), c]))

export interface ChapterLinks {
  events: HistEvent[]
  places: Place[]
  rulers: Ruler[]
}
export const chapterLinks = new Map<string, ChapterLinks>()
function link(refs: ChronicleRef[] | undefined, fn: (l: ChapterLinks) => void) {
  for (const r of refs ?? []) {
    const k = chapterKey(r)
    if (!chapterLinks.has(k)) chapterLinks.set(k, { events: [], places: [], rulers: [] })
    fn(chapterLinks.get(k)!)
  }
}
for (const e of events) link(e.chronicle, (l) => l.events.push(e))
for (const r of rulers) link(r.chronicle, (l) => l.rulers.push(r))
for (const p of places) {
  const refs = [...(p.chronicle ?? []), ...(p.stories ?? []).flatMap((s) => s.chronicle ?? [])]
  const uniqRefs = [...new Map(refs.map((r) => [chapterKey(r), r])).values()]
  link(uniqRefs, (l) => l.places.push(p))
}
/** Earliest year associated with a chapter (for jumping the timeline). */
export function chapterYear(k: string): number | undefined {
  const l = chapterLinks.get(k)
  if (!l) return undefined
  const ys = [...l.rulers.map((r) => r.start), ...l.events.map((e) => e.start)]
  return ys.length ? Math.min(...ys) : undefined
}

export const sites = places.filter((p) => p.siteType)
export const SITE_SYMBOL: Record<NonNullable<Place['siteType']>, string> = {
  stupa: '▲', monastery: '⌂', temple: '☸', 'cave-temple': '◠', kovil: '◆', mosque: '☾', church: '✝', fort: '▣', palace: '♛', reservoir: '≈', sculpture: '✦', ruins: '▦', shrine: '✺',
}
export const RELIGION_COLOR: Record<NonNullable<Place['religion']>, string> = {
  buddhist: '#c77700', hindu: '#b0306a', muslim: '#1f7a4d', christian: '#2a5db0', secular: '#555', multi: '#7a4fb0',
}

export const relics = relicsJson as Relic[]
export const relicById = new Map(relics.map((r) => [r.id, r]))
export const regions = regionsJson as unknown as Region[]
for (const r of relics) for (const st of r.stations) link(st.chronicle, (l) => { const p = placeById.get(st.placeId); if (p && !l.places.includes(p)) l.places.push(p) })

export const reconstructions = reconJson as unknown as Reconstruction[]
export const reconByPlace = new Map(reconstructions.map((r) => [r.placeId, r]))

export const catLabel = (c: Category) => tr(`cat_${c}` as StrKey)
export const confLabel = (c: Confidence) => tr(`conf_${c}` as StrKey)
