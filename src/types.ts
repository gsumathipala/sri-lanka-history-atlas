/**
 * Core data model for the Sri Lanka History Atlas.
 *
 * Year convention: integers, negative = BCE, positive = CE (no year 0 in data).
 * Deep-prehistoric dates are stored as BCE equivalents of BP ages
 * (BP = years before 1950, so year = 1950 - BP).
 */

export type EvidenceType =
  | 'archaeological' // excavation, survey, stratigraphy
  | 'radiometric' // radiocarbon, OSL, TL, etc.
  | 'epigraphic' // inscriptions
  | 'chronicle' // vamsa literature and other indigenous narrative histories
  | 'foreign-account' // travellers, classical and Chinese/Arabic sources
  | 'numismatic'
  | 'architectural' // standing monuments
  | 'archival' // colonial and state archives, letters, registers
  | 'legal-official' // statutes, treaties, constitutions, official reports
  | 'scientific' // palaeoenvironmental, isotopic, genetic
  | 'contemporary-report' // journalism, NGO/UN reporting
  | 'oral-tradition'
  | 'synthesis' // interpretation in modern scholarship (cite primary evidence where possible)

export type Confidence =
  | 'established' // multiple independent lines of evidence
  | 'probable' // good evidence, some uncertainty in detail or date
  | 'traditional' // rests mainly on chronicle tradition
  | 'contested' // scholars actively disagree on facts, date or interpretation
  | 'legendary' // mythic or religious tradition, no historical corroboration

export type Category =
  | 'prehistory'
  | 'polity'
  | 'religion'
  | 'conflict'
  | 'economy'
  | 'culture'
  | 'foreign-contact'
  | 'colonial'
  | 'society'
  | 'politics'
  | 'disaster'

export interface Source {
  id: string
  authors: string
  year: string
  title: string
  publication?: string // journal / series
  publisher?: string
  kind: 'primary' | 'secondary' | 'official' | 'reference'
  url?: string
  doi?: string
  notes?: string
}

export interface Place {
  id: string
  name: string
  altNames?: string[]
  lat: number
  lng: number
  /** How precisely the coordinates locate the place. */
  precision: 'exact' | 'approximate' | 'region'
  kind: 'site' | 'city' | 'region' | 'natural'
  description?: string
  /** Heritage-site fields (optional) */
  siteType?: 'stupa' | 'monastery' | 'temple' | 'cave-temple' | 'kovil' | 'mosque' | 'church' | 'fort' | 'palace' | 'reservoir' | 'sculpture' | 'ruins' | 'shrine'
  religion?: 'buddhist' | 'hindu' | 'muslim' | 'christian' | 'secular' | 'multi'
  /** Approximate founding year, used to show the site on the map from that date. */
  founded?: number
  foundedLabel?: string
  groups?: ('solosmasthana' | 'atamasthana' | 'unesco')[]
  stories?: Story[]
  chronicle?: ChronicleRef[]
  wiki?: string
  /** Wikidata QID, Commons image (Special:FilePath URL), coordinate provenance */
  wikidata?: string
  image?: string
  coordSource?: string
  importedFrom?: 'wikidata'
}

export interface Evidence {
  type: EvidenceType
  description: string
  sourceId: string
  /** chapter, verse, page, plate, inscription number, etc. */
  locator?: string
}

export interface Perspective {
  label: string
  view: string
  sourceId?: string
}

export interface HistEvent {
  id: string
  title: string
  start: number
  end?: number
  /** Overrides the auto-generated date label (e.g. "c. 48,000 BP"). */
  dateLabel?: string
  /** Explains how the date was derived or why it is uncertain. */
  dateNote?: string
  category: Category
  confidence: Confidence
  placeIds: string[]
  summary: string
  evidence: Evidence[]
  historiography?: string
  perspectives?: Perspective[]
  tags?: string[]
  chronicle?: ChronicleRef[]
  wiki?: string
  review: {
    status: 'draft' | 'reviewed'
    reviewer?: string
    date?: string
    notes?: string
  }
}

export interface Period {
  id: string
  name: string
  start: number
  end: number
  track: 'era' | 'polity' | 'foreign'
  color: string
  capitalPlaceId?: string
  description: string
  sourceIds: string[]
}

/** Reference into an indigenous chronicle. */
export type ChronicleWork = 'dipavamsa' | 'mahavamsa' | 'culavamsa' | 'rajavaliya' | 'yalpana-vaipava-malai'

export interface ChronicleRef {
  work: ChronicleWork
  chapter: number
  /** verse range, e.g. "1-28" */
  verses?: string
}

export interface ChronicleChapter {
  work: ChronicleWork
  chapter: number
  title: string
  summary: string
  /** true when the chapter boundaries / contents need checking against the edition */
  approximate?: boolean
}

export type RulerRole =
  | 'king'
  | 'queen'
  | 'regent'
  | 'sub-king'
  | 'invader'
  | 'foreign-sovereign'
  | 'captain-general'
  | 'governor'
  | 'governor-general'
  | 'prime-minister'
  | 'president'

export interface Ruler {
  id: string
  name: string
  altNames?: string[]
  start: number
  end: number
  role: RulerRole
  /** key into POLITY_META */
  polity: string
  capitalPlaceId?: string
  summary?: string
  dateNote?: string
  /** Geiger's corrected chronology where it differs from the conventional list */
  geiger?: string
  chronicle?: ChronicleRef[]
  /** Exact English Wikipedia title; otherwise a search is used. */
  wiki?: string
}

export interface Story {
  title: string
  text: string
  chronicle?: ChronicleRef[]
  /** 'chronicle' | 'tradition' | 'history' - how the story is grounded */
  basis: 'chronicle' | 'tradition' | 'history' | 'archaeology'
  sourceId?: string
}

/** A relic (or relic-like sacred object) and the places it was kept over time. */
export interface RelicStation {
  placeId: string
  start: number
  end?: number
  label?: string
  note: string
  basis: 'chronicle' | 'tradition' | 'history' | 'archaeology'
  chronicle?: ChronicleRef[]
  sourceId?: string
}

export interface Relic {
  id: string
  name: string
  altNames?: string[]
  /** saririka = bodily; paribhogika = objects of use (incl. the Bodhi tree); uddesika = commemorative */
  kind: 'saririka' | 'paribhogika' | 'uddesika'
  summary: string
  historiography?: string
  stations: RelicStation[]
  /** true: stations are successive custody (draw as a journey); false: places where portions are enshrined */
  journey: boolean
  wiki?: string
  color: string
}

/** Schematic historical region; polygons[0] is the outer ring, further rings are holes. */
export interface Region {
  id: string
  name: string
  start: number
  end: number
  color: string
  polygons: [number, number][][]
  note: string
  sourceIds: string[]
}

/** Parametric 3D reconstruction of a monument (schematic; dimensions in metres). */
export interface Reconstruction {
  placeId: string
  type: 'stupa' | 'vatadage' | 'pillar-hall'
  /** dome profile: bubble (bubbulakara), bell (ghantakara), pot (ghatakara), paddy-heap (dhanyakara) */
  shape?: 'bubble' | 'bell' | 'pot' | 'paddy-heap'
  diameter?: number
  height?: number
  platform?: { side: number; height: number; elephantWall?: boolean }
  vatadage?: { platformRadius: number; platformHeight: number; rings: { radius: number; count: number }[]; pillarHeight: number }
  grid?: { cols: number; rows: number; spacing: number; pillarHeight: number }
  /** Optional real 3D model (glTF/GLB, e.g. from photogrammetry); replaces the parametric geometry. */
  model?: { url: string; scale?: number; rotationDeg?: number; credit: string; licence: string }
  state: string
  confidence: 'approximate' | 'uncertain' | 'illustrative'
  note: string
  sourceIds: string[]
}
