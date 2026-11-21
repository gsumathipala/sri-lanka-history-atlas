import { useEffect, useState } from 'react'
import type { HistEvent, Source } from '../types'
import { sourceById, sources } from '../lib/data'

/* ------------------------------------------------------------------ */
/* Local review store (browser) -> exported JSON -> scripts/apply-reviews.mjs */
/* ------------------------------------------------------------------ */

export interface EvidenceCheck {
  checked: boolean
  locator?: string
  comment?: string
}
export interface ReviewRecord {
  eventId: string
  reviewer: string
  date: string
  decision: 'reviewed' | 'needs-changes'
  evidence: EvidenceCheck[]
  notes: string
}
const KEY = 'lt-reviews-v1'
const NAME_KEY = 'lt-reviewer'
function readAll(): Record<string, ReviewRecord> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}
function writeAll(v: Record<string, ReviewRecord>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
}
export function localReviewCount() {
  return Object.keys(readAll()).length
}

function download(name: string, text: string, type = 'application/json') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
export function exportReviews() {
  download(`lanka-reviews-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(Object.values(readAll()), null, 2))
}

export function ReviewBox({ e }: { e: HistEvent }) {
  const [open, setOpen] = useState(false)
  const [rec, setRec] = useState<ReviewRecord | undefined>(() => readAll()[e.id])
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [checks, setChecks] = useState<EvidenceCheck[]>(rec?.evidence ?? e.evidence.map((ev) => ({ checked: false, locator: ev.locator })))
  const [notes, setNotes] = useState(rec?.notes ?? '')
  useEffect(() => {
    const r = readAll()[e.id]
    setRec(r)
    setChecks(r?.evidence ?? e.evidence.map((ev) => ({ checked: false, locator: ev.locator })))
    setNotes(r?.notes ?? '')
  }, [e])
  const allChecked = checks.every((c) => c.checked)
  function save(decision: ReviewRecord['decision']) {
    if (!name.trim()) return alert('Enter your name as reviewer.')
    try {
      localStorage.setItem(NAME_KEY, name.trim())
    } catch {
      /* ignore */
    }
    const r: ReviewRecord = { eventId: e.id, reviewer: name.trim(), date: new Date().toISOString().slice(0, 10), decision, evidence: checks, notes }
    const all = readAll()
    all[e.id] = r
    writeAll(all)
    setRec(r)
    setOpen(false)
  }
  return (
    <div className="review">
      <button className="chip" onClick={() => setOpen(!open)}>
        ✔︎ {rec ? `Your review: ${rec.decision} (${rec.date})` : 'Review this entry'}
      </button>
      {open && (
        <div className="review-form">
          <p className="muted small">
            Check each evidence item against the cited edition. Correct the locator (chapter, verse, page, inscription no.) if needed. An entry can be marked reviewed only when every item is checked. Reviews are stored in
            this browser; use <b>Sources → Export my reviews</b> and send the file to the maintainers.
          </p>
          <label>
            Reviewer name <input value={name} onChange={(ev) => setName(ev.target.value)} placeholder="Name, affiliation" />
          </label>
          <ol>
            {e.evidence.map((ev, i) => (
              <li key={i}>
                <label className="review-check">
                  <input type="checkbox" checked={checks[i]?.checked ?? false} onChange={(x) => setChecks(checks.map((c, j) => (j === i ? { ...c, checked: x.target.checked } : c)))} />
                  {sourceById.get(ev.sourceId)?.authors.split(',')[0]} ({sourceById.get(ev.sourceId)?.year}): {ev.description.slice(0, 80)}
                </label>
                <input className="review-loc" value={checks[i]?.locator ?? ''} placeholder="verified locator" onChange={(x) => setChecks(checks.map((c, j) => (j === i ? { ...c, locator: x.target.value } : c)))} />
              </li>
            ))}
          </ol>
          <textarea value={notes} onChange={(x) => setNotes(x.target.value)} placeholder="Notes: corrections to the summary, dating, confidence…" rows={3} />
          <div className="review-actions">
            <button disabled={!allChecked} onClick={() => save('reviewed')} title={allChecked ? '' : 'Check every evidence item first'}>
              Mark reviewed
            </button>
            <button onClick={() => save('needs-changes')}>Needs changes</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Citation export                                                     */
/* ------------------------------------------------------------------ */

const esc = (s: string) => s.replace(/[{}]/g, '').replace(/&/g, '\\&')
export function toBibtex(s: Source): string {
  const type = s.publication && /\d+\(?\d*\)?:/.test(s.publication) ? 'article' : s.kind === 'official' ? 'misc' : 'book'
  const f: [string, string | undefined][] = [
    ['author', s.authors.replace(/, & /g, ' and ').replace(/ & /g, ' and ')],
    ['title', s.title],
    ['year', s.year],
    [type === 'article' ? 'journal' : 'series', s.publication],
    ['publisher', s.publisher],
    ['doi', s.doi],
    ['url', s.url],
    ['note', s.notes],
  ]
  return `@${type}{${s.id},\n${f
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k} = {${esc(v!)}}`)
    .join(',\n')}\n}`
}
export function toCsl(s: Source) {
  return {
    id: s.id,
    type: s.publication && /\d+\(?\d*\)?:/.test(s.publication) ? 'article-journal' : s.kind === 'official' ? 'document' : 'book',
    title: s.title,
    author: s.authors.split(/;|&| and /).map((a) => ({ literal: a.trim().replace(/,$/, '') })).filter((a) => a.literal),
    issued: { 'date-parts': [[parseInt(s.year) || s.year]] },
    'container-title': s.publication,
    publisher: s.publisher,
    DOI: s.doi,
    URL: s.url,
  }
}
export function exportBibtex(list: Source[] = sources) {
  download('lanka-through-time.bib', list.map(toBibtex).join('\n\n'), 'application/x-bibtex')
}
export function exportCsl(list: Source[] = sources) {
  download('lanka-through-time.csl.json', JSON.stringify(list.map(toCsl), null, 2))
}

export function CiteEntry({ e }: { e: HistEvent }) {
  const [copied, setCopied] = useState(false)
  const url = `${location.origin}${location.pathname}#event=${e.id}`
  const text = `Lanka Through Time (${new Date().getFullYear()}). "${e.title}" [entry ${e.id}, ${e.review.status}]. ${url} (accessed ${new Date().toISOString().slice(0, 10)}).`
  const srcs = [...new Set(e.evidence.map((x) => x.sourceId))].map((id) => sourceById.get(id)).filter(Boolean) as Source[]
  return (
    <div className="cite-entry">
      <button
        className="chip"
        onClick={() => {
          navigator.clipboard?.writeText(text).then(() => setCopied(true))
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        ❝ {copied ? 'Copied' : 'Cite this entry'}
      </button>{' '}
      <button className="chip" onClick={() => exportBibtex(srcs)}>
        ⬇ BibTeX of its sources
      </button>
    </div>
  )
}
