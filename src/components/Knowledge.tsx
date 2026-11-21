import { useEffect, useMemo, useState } from 'react'
import type { ChronicleRef, ChronicleWork, Ruler } from '../types'
import {
  CHRONICLE_META,
  POLITY_META,
  ROLE_LABEL,
  chapterByKey,
  chapterKey,
  chapterLinks,
  chapterYear,
  chapters,
  placeById,
  rulers,
  sourceById,
} from '../lib/data'
import { formatRange, formatYear } from '../lib/time'
import { TextReader, loadTextIndex, type TextIndex } from './TextReader'

/* ------------------------------------------------------------------ */
/* Wikipedia card: further reading + media, never counted as evidence  */
/* ------------------------------------------------------------------ */

interface WikiData {
  title: string
  extract: string
  url: string
  thumb?: string
}
const wikiCache = new Map<string, Promise<WikiData | null>>()

function fetchWiki(title: string | undefined, query: string, mustContain?: string): Promise<WikiData | null> {
  const key = title ? `t:${title}` : `q:${query}|${mustContain ?? ''}`
  if (!wikiCache.has(key)) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      prop: 'pageimages|extracts|info',
      inprop: 'url',
      exintro: '1',
      explaintext: '1',
      exsentences: '3',
      pithumbsize: '480',
      redirects: '1',
    })
    if (title) params.set('titles', title)
    else {
      params.set('generator', 'search')
      params.set('gsrsearch', query)
      params.set('gsrlimit', '5')
    }
    wikiCache.set(
      key,
      fetch(`https://en.wikipedia.org/w/api.php?${params}`)
        .then((r) => r.json())
        .then((j) => {
          const pages = (Object.values(j?.query?.pages ?? {}) as { missing?: string; index?: number; title: string; extract?: string; fullurl: string; thumbnail?: { source: string } }[])
            .filter((x) => x.missing === undefined)
            .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
          // For search results, only accept a page whose title contains the key name - a wrong card is worse than none.
          const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          const p = title ? pages[0] : pages.find((x) => !mustContain || norm(x.title).includes(norm(mustContain)))
          if (!p) return title ? fetchWiki(undefined, query, mustContain) : null
          return { title: p.title, extract: p.extract ?? '', url: p.fullurl, thumb: p.thumbnail?.source }
        })
        .catch(() => null),
    )
  }
  return wikiCache.get(key)!
}

export function WikiCard({ title, query, name }: { title?: string; query: string; name?: string }) {
  const [data, setData] = useState<WikiData | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    setData(undefined)
    fetchWiki(title, query, name).then((d) => live && setData(d))
    return () => {
      live = false
    }
  }, [title, query, name])
  if (data === undefined) return <div className="wiki loading">Loading Wikipedia…</div>
  if (!data) return null
  return (
    <aside className="wiki">
      {data.thumb && <img src={data.thumb} alt={data.title} loading="lazy" />}
      <div>
        <div className="wiki-head">
          Wikipedia: <a href={data.url} target="_blank" rel="noreferrer">{data.title}</a>
          {!title && <span className="muted small"> (auto-matched)</span>}
        </div>
        <p>{data.extract}</p>
        <div className="muted small">Further reading only; Wikipedia is not cited as evidence. Text and image licences apply (CC BY-SA / Commons).</div>
      </div>
    </aside>
  )
}

/* ------------------------------------------------------------------ */
/* Chronicle reference chips                                           */
/* ------------------------------------------------------------------ */

export function ChronicleChips({ refs, onChapter }: { refs?: ChronicleRef[]; onChapter: (key: string) => void }) {
  if (!refs?.length) return null
  return (
    <div className="chron-chips">
      {refs.map((r, i) => (
        <button key={i} className={`chip chron-${r.work}`} onClick={() => onChapter(chapterKey(r) + (r.verses ? `:${r.verses}` : ''))} title={chapterByKey.get(chapterKey(r))?.title}>
          📜 {CHRONICLE_META[r.work].label} {r.chapter}
          {r.verses && <>.{r.verses}</>}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Chronicles browser                                                  */
/* ------------------------------------------------------------------ */

const WORKS: ChronicleWork[] = ['dipavamsa', 'mahavamsa', 'culavamsa', 'rajavaliya', 'yalpana-vaipava-malai']
const TRAVEL: { id: string; label: string }[] = [
  { id: 'faxian', label: 'Faxian (Legge)' },
  { id: 'knox', label: 'Knox 1681' },
]

export function ChroniclesPanel({
  focus,
  onSelect,
  onPlace,
  onRuler,
  onYear,
}: {
  focus?: string
  onSelect: (id: string) => void
  onPlace: (id: string) => void
  onRuler: (id: string) => void
  onYear: (y: number) => void
}) {
  const [fw, fch, fverses] = (focus ?? '').split(':')
  const focusKey = fw ? `${fw}:${fch}` : undefined
  const [work, setWork] = useState<string>((fw as ChronicleWork) || 'mahavamsa')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [tindex, setTindex] = useState<TextIndex | null>(null)
  useEffect(() => {
    loadTextIndex().then(setTindex)
  }, [])
  useEffect(() => {
    if (focusKey) {
      setWork(fw)
      setOpen((o) => new Set(o).add(focusKey))
      setTimeout(() => document.getElementById(`ch-${focusKey}`)?.scrollIntoView({ block: 'start' }), 50)
    }
  }, [focus]) // eslint-disable-line react-hooks/exhaustive-deps
  const hasText = (w: string, n: number) => !!tindex?.[w]?.chapters.some((c) => c.chapter === n)
  const toggle = (k: string) => setOpen((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n })
  if (TRAVEL.some((t) => t.id === work)) {
    const ti = tindex?.[work]
    return (
      <div className="chronicles">
        <h2>Primary texts</h2>
        <div className="seg">
          {WORKS.map((w) => (
            <button key={w} onClick={() => setWork(w)}>
              {CHRONICLE_META[w].label}
            </button>
          ))}
          {TRAVEL.map((t) => (
            <button key={t.id} className={t.id === work ? 'on' : ''} onClick={() => setWork(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        {ti?.chapters.map((c) => {
          const k = `${work}:${c.chapter}`
          return (
            <section key={k} className="chapter">
              <h3 className="chapter-title">
                <span className="chapter-no">{c.chapter}</span> {c.title}
              </h3>
              <button className="chip small" onClick={() => toggle(k)}>
                📖 {open.has(k) ? 'Hide text' : 'Read text'}
              </button>
              {open.has(k) && <TextReader work={work} chapter={c.chapter} />}
            </section>
          )
        })}
      </div>
    )
  }
  const list = chapters.filter((c) => c.work === work).sort((a, b) => a.chapter - b.chapter)
  const meta = CHRONICLE_META[work as ChronicleWork]
  const src = meta.sourceId ? sourceById.get(meta.sourceId) : undefined
  return (
    <div className="chronicles">
      <h2>The Chronicles</h2>
      <div className="seg">
        {WORKS.map((w) => (
          <button key={w} className={w === work ? 'on' : ''} onClick={() => setWork(w)}>
            {CHRONICLE_META[w].label}
          </button>
        ))}
        {TRAVEL.map((t) => (
          <button key={t.id} onClick={() => setWork(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <p>
        <strong>{meta.label}</strong> ({meta.span}). {meta.description}
      </p>
      {src && <p className="muted small">Edition used: {src.authors}, <i>{src.title}</i> ({src.year}).</p>}
      <p className="note">
        The vamsas are Buddhist monastic histories with a Mahavihara viewpoint, and are most reliable for the periods closest to when each part was written. Where possible, read them against inscriptions and
        archaeology.
        {!['mahavamsa', 'dipavamsa'].includes(work) && ' The chapter boundaries and summaries for this chronicle are approximate; check them against the edition.'}
        {['mahavamsa', 'dipavamsa'].includes(work) && ' Chapter titles and summaries have been checked against the public-domain text, which you can read below.'}
      </p>
      {list.map((c) => {
        const k = chapterKey(c)
        const l = chapterLinks.get(k)
        const y = chapterYear(k)
        return (
          <section key={k} id={`ch-${k}`} className={`chapter${focusKey === k ? ' focus' : ''}`}>
            <h3 className="chapter-title">
              <span className="chapter-no">{c.chapter}</span> {c.title}
            </h3>
            <p>{c.summary}</p>
            {y !== undefined && (
              <button className="chip" onClick={() => onYear(y)}>
                ⏱ Go to {formatYear(y)}
              </button>
            )}{' '}
            {hasText(work, c.chapter) && (
              <button className="chip" onClick={() => toggle(k)}>
                📖 {open.has(k) ? 'Hide text' : 'Read text'}
              </button>
            )}
            {open.has(k) && <TextReader work={work} chapter={c.chapter} verses={focusKey === k ? fverses : undefined} />}
            {l && (
              <div className="chapter-links">
                {l.rulers.length > 0 && (
                  <div>
                    <b>Rulers:</b>{' '}
                    {l.rulers.map((r, i) => (
                      <span key={r.id}>
                        {i > 0 && ', '}
                        <a href="#" onClick={(e) => (e.preventDefault(), onRuler(r.id))}>
                          {r.name}
                        </a>
                      </span>
                    ))}
                  </div>
                )}
                {l.places.length > 0 && (
                  <div>
                    <b>Places:</b>{' '}
                    {l.places.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && ', '}
                        <a href="#" onClick={(e) => (e.preventDefault(), onPlace(p.id))}>
                          {p.name}
                        </a>
                      </span>
                    ))}
                  </div>
                )}
                {l.events.length > 0 && (
                  <div>
                    <b>Events:</b>{' '}
                    {l.events.map((e, i) => (
                      <span key={e.id}>
                        {i > 0 && ', '}
                        <a href="#" onClick={(ev) => (ev.preventDefault(), onSelect(e.id))}>
                          {e.title}
                        </a>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Rulers                                                              */
/* ------------------------------------------------------------------ */

export function RulerRow({ r, onRuler }: { r: Ruler; onRuler: (id: string) => void }) {
  const pm = POLITY_META[r.polity]
  return (
    <button className="event-row" onClick={() => onRuler(r.id)}>
      <span className="dot" style={{ background: pm?.color ?? '#888', borderRadius: 2 }} />
      <span className="event-row-body">
        <span className="event-row-title">{r.name}</span>
        <span className="event-row-meta">
          {formatRange(r.start, r.end)} · {ROLE_LABEL[r.role]} · {pm?.label}
        </span>
      </span>
    </button>
  )
}

export function RulersPanel({ year, onRuler }: { year: number; onRuler: (id: string) => void }) {
  const [polity, setPolity] = useState<string>('now')
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    let l = polity === 'now' ? rulers.filter((r) => r.start <= year && r.end >= Math.floor(year)) : polity === 'all' ? rulers : rulers.filter((r) => r.polity === polity)
    if (q.trim()) l = l.filter((r) => (r.name + ' ' + (r.altNames ?? []).join(' ')).toLowerCase().includes(q.toLowerCase()))
    return l
  }, [polity, year, q])
  return (
    <div>
      <h2>Rulers, invaders and governors</h2>
      <div className="ruler-filters">
        <select value={polity} onChange={(e) => setPolity(e.target.value)} aria-label="Polity">
          <option value="now">Ruling at {formatYear(year)}</option>
          <option value="all">All ({rulers.length})</option>
          {Object.entries(POLITY_META)
            .sort((a, b) => a[1].order - b[1].order)
            .map(([k, v]) => (
              <option key={k} value={k}>
                {v.label} ({rulers.filter((r) => r.polity === k).length})
              </option>
            ))}
        </select>
        <input type="search" placeholder="Filter by name" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="note">
        Regnal dates follow the conventional chronology. Before the 2nd century CE, Geiger's corrected chronology places most reigns about 60 years later; see the entry "The chronology problem of the early
        kings". Short reigns and joint rule make many dates approximate.
      </p>
      {list.length === 0 && <p className="muted">No ruler recorded for this date.</p>}
      {list.map((r) => (
        <RulerRow key={r.id} r={r} onRuler={onRuler} />
      ))}
    </div>
  )
}

export function RulerDetail({ r, onChapter, onPlace, onRuler, onYear }: { r: Ruler; onChapter: (k: string) => void; onPlace: (id: string) => void; onRuler: (id: string) => void; onYear: (y: number) => void }) {
  const same = rulers.filter((x) => x.polity === r.polity)
  const i = same.findIndex((x) => x.id === r.id)
  const prev = same[i - 1]
  const next = same[i + 1]
  const cap = r.capitalPlaceId ? placeById.get(r.capitalPlaceId) : undefined
  const pm = POLITY_META[r.polity]
  const wikiQuery = `${r.name.replace(/\(.*\)/, '').trim()} ${['governor', 'captain-general', 'governor-general'].includes(r.role) ? 'Ceylon governor' : ['president', 'prime-minister'].includes(r.role) ? 'Sri Lanka' : 'Sri Lanka king'}`
  return (
    <article className="detail">
      <div className="detail-cat" style={{ color: pm?.color }}>
        {ROLE_LABEL[r.role]} · {pm?.label}
      </div>
      <h2>{r.name}</h2>
      <div className="detail-date">
        <button className="chip" onClick={() => onYear(r.start)}>
          ⏱ {formatRange(r.start, r.end)}
        </button>
        {r.geiger && <span className="muted small">Geiger: {r.geiger}</span>}
      </div>
      {r.dateNote && <p className="note">Dating: {r.dateNote}</p>}
      {r.summary && <p>{r.summary}</p>}
      {cap && (
        <div className="places">
          <button className="chip" onClick={() => onPlace(cap.id)}>
            📍 Seat: {cap.name}
          </button>
        </div>
      )}
      {r.chronicle && (
        <>
          <h3>In the chronicles</h3>
          <ChronicleChips refs={r.chronicle} onChapter={onChapter} />
        </>
      )}
      <h3>Succession</h3>
      <div className="succession">
        {prev ? (
          <button className="chip" onClick={() => onRuler(prev.id)}>
            ← {prev.name}
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button className="chip" onClick={() => onRuler(next.id)}>
            {next.name} →
          </button>
        )}
      </div>
      <h3>Media & further reading</h3>
      <WikiCard title={r.wiki} query={wikiQuery} name={r.name.replace(/\(.*\)/, '').trim().split(' ').filter((w) => !/^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/.test(w))[0]} />
    </article>
  )
}
