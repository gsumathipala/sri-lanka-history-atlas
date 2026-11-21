import type { HistEvent } from '../types'
import {
  CATEGORY_META,
  CONFIDENCE_META,
  EVIDENCE_META,
  citation,
  eventsByPlace,
  eventsBySource,
  placeById,
  sourceById,
  sources,
} from '../lib/data'
import { formatRange, formatYear } from '../lib/time'
import { ChronicleChips, WikiCard } from './Knowledge'
import { RELIGION_COLOR, SITE_SYMBOL, reconByPlace, rulers } from '../lib/data'

const dateOf = (e: HistEvent) => e.dateLabel ?? formatRange(e.start, e.end)

export function ConfidenceBadge({ c }: { c: HistEvent['confidence'] }) {
  return (
    <span className={`badge conf-${c}`} title={CONFIDENCE_META[c].description}>
      {CONFIDENCE_META[c].label}
    </span>
  )
}

export function EventRow({ e, onSelect, active }: { e: HistEvent; onSelect: (id: string) => void; active?: boolean }) {
  return (
    <button className={`event-row${active ? ' active' : ''}`} onClick={() => onSelect(e.id)}>
      <span className="dot" style={{ background: CATEGORY_META[e.category].color }} />
      <span className="event-row-body">
        <span className="event-row-title">{e.title}</span>
        <span className="event-row-meta">
          {dateOf(e)} · <ConfidenceBadge c={e.confidence} />
        </span>
      </span>
    </button>
  )
}

export function EventList({ events, onSelect, heading }: { events: HistEvent[]; onSelect: (id: string) => void; heading: string }) {
  return (
    <div>
      <h2>{heading}</h2>
      {events.length === 0 && <p className="muted">No events in this time window. Drag the timeline or widen the window.</p>}
      {events.map((e) => (
        <EventRow key={e.id} e={e} onSelect={onSelect} />
      ))}
    </div>
  )
}

export function EventDetail({ e, onPlace, onSource, onSelect, onChapter }: { e: HistEvent; onPlace: (id: string) => void; onSource: (id: string) => void; onSelect: (id: string) => void; onChapter: (k: string) => void }) {
  const related = [...new Set(e.placeIds.flatMap((p) => eventsByPlace.get(p) ?? []))].filter((x) => x.id !== e.id).slice(0, 8)
  return (
    <article className="detail">
      <div className="detail-cat" style={{ color: CATEGORY_META[e.category].color }}>
        {CATEGORY_META[e.category].label}
      </div>
      <h2>{e.title}</h2>
      <div className="detail-date">
        {dateOf(e)} <ConfidenceBadge c={e.confidence} />
        {e.review.status === 'draft' && (
          <span className="badge draft" title="Not yet checked against the cited sources by a human reviewer">
            Unreviewed draft
          </span>
        )}
      </div>
      {e.dateNote && <p className="note">Dating: {e.dateNote}</p>}

      <p>{e.summary}</p>

      <div className="places">
        {e.placeIds.map((p) => {
          const pl = placeById.get(p)
          return (
            <button key={p} className="chip" onClick={() => onPlace(p)}>
              📍 {pl?.name ?? p}
              {pl && pl.precision !== 'exact' && <small> ({pl.precision})</small>}
            </button>
          )
        })}
      </div>

      <h3>Evidence</h3>
      <ol className="evidence">
        {e.evidence.map((ev, i) => {
          const s = sourceById.get(ev.sourceId)
          return (
            <li key={i}>
              <div className="ev-type">
                <span aria-hidden>{EVIDENCE_META[ev.type].icon}</span> {EVIDENCE_META[ev.type].label}
              </div>
              <div>{ev.description}</div>
              {s && (
                <button className="cite" onClick={() => onSource(s.id)}>
                  {s.authors} ({s.year}), <i>{s.title}</i>
                  {ev.locator && <>, {ev.locator}</>}
                </button>
              )}
            </li>
          )
        })}
      </ol>

      {e.perspectives && (
        <>
          <h3>Perspectives</h3>
          <ul className="perspectives">
            {e.perspectives.map((p, i) => (
              <li key={i}>
                <strong>{p.label}:</strong> {p.view}{' '}
                {p.sourceId && sourceById.get(p.sourceId) && (
                  <button className="cite inline" onClick={() => onSource(p.sourceId!)}>
                    [{sourceById.get(p.sourceId)!.authors.split(',')[0]} {sourceById.get(p.sourceId)!.year}]
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {e.historiography && (
        <>
          <h3>Historiography & caveats</h3>
          <p className="historiography">{e.historiography}</p>
        </>
      )}

      {e.chronicle && (
        <>
          <h3>In the chronicles</h3>
          <ChronicleChips refs={e.chronicle} onChapter={onChapter} />
        </>
      )}

      {e.review.notes && <p className="note">Reviewer note: {e.review.notes}</p>}

      <h3>Media & further reading</h3>
      <WikiCard title={e.wiki} query={`${e.title} Sri Lanka`} />

      {related.length > 0 && (
        <>
          <h3>Also at these places</h3>
          {related.map((r) => (
            <EventRow key={r.id} e={r} onSelect={onSelect} />
          ))}
        </>
      )}
      <p className="permalink">
        Permalink: <code>#event={e.id}</code>
      </p>
    </article>
  )
}

export function PlaceDetail({ id, onSelect, onChapter, onRuler, onSource, onFlyover }: { id: string; onSelect: (id: string) => void; onChapter: (k: string) => void; onRuler: (id: string) => void; onSource: (id: string) => void; onFlyover: (id: string) => void }) {
  const p = placeById.get(id)
  if (!p) return null
  const evs = eventsByPlace.get(id) ?? []
  const seatOf = rulers.filter((r) => r.capitalPlaceId === id)
  return (
    <article className="detail">
      <div className="detail-cat">Place</div>
      <h2>{p.name}</h2>
      {p.altNames && <p className="muted">Also: {p.altNames.join(', ')}</p>}
      {p.image && (
        <figure className="site-photo">
          <img src={`${p.image}?width=640`} alt={p.name} loading="lazy" />
          <figcaption className="muted small">
            Photo: Wikimedia Commons ({' '}
            <a href={p.image.replace('Special:FilePath/', 'File:')} target="_blank" rel="noreferrer">
              licence and author
            </a>
            )
          </figcaption>
        </figure>
      )}
      <p className="muted">
        {p.lat.toFixed(4)}, {p.lng.toFixed(4)} · {p.precision} location · {p.kind}
        {p.coordSource && (
          <>
            {' '}
            · coordinates from{' '}
            <a href={`https://www.wikidata.org/wiki/${p.coordSource.split(':')[1]}`} target="_blank" rel="noreferrer">
              Wikidata {p.coordSource.split(':')[1]}
            </a>
          </>
        )}
      </p>
      {p.importedFrom && <p className="note">Imported from Wikidata; this site has not yet been curated (no stories, chronicle links or dating review).</p>}
      {p.kind !== 'region' && (
        <button className="flyover-btn" onClick={() => onFlyover(p.id)}>
          🛩 {reconByPlace.has(p.id) ? '3D flyover with reconstruction' : '3D flyover of the site today'}
        </button>
      )}
      {reconByPlace.has(p.id) && (() => {
        const r = reconByPlace.get(p.id)!
        return (
          <p className="note">
            <strong>3D reconstruction</strong> ({r.confidence}):{' '}
            {r.type === 'pillar-hall' ? `${r.grid!.cols * r.grid!.rows} pillars` : `${r.shape} dome, diameter c. ${r.diameter} m, height c. ${r.height} m`}. {r.state}.{' '}
            {r.sourceIds.map((sid) => sourceById.get(sid)).filter(Boolean).map((s, i) => (
              <button key={i} className="cite inline" onClick={() => onSource(s!.id)}>
                [{s!.authors.split(',')[0]} {s!.year}]
              </button>
            ))}
          </p>
        )
      })()}
      {p.siteType && (
        <p className="site-meta">
          <span style={{ color: p.religion ? RELIGION_COLOR[p.religion] : undefined }}>{SITE_SYMBOL[p.siteType]}</span> {p.siteType.replace('-', ' ')}
          {p.religion && <> · {p.religion}</>}
          {(p.foundedLabel || p.founded !== undefined) && <> · founded {p.foundedLabel ?? formatYear(p.founded!)}</>}
          {p.groups?.map((g) => (
            <span key={g} className="badge group">
              {g === 'solosmasthana' ? 'Solosmasthana (16 sacred sites)' : g === 'atamasthana' ? 'Atamasthana (8 sacred sites)' : 'UNESCO World Heritage'}
            </span>
          ))}
        </p>
      )}
      {p.description && <p>{p.description}</p>}
      {p.stories && (
        <>
          <h3>Stories</h3>
          {p.stories.map((st, i) => (
            <div key={i} className="story">
              <div className="story-head">
                <strong>{st.title}</strong> <span className={`badge basis-${st.basis}`}>{st.basis}</span>
              </div>
              <p>{st.text}</p>
              <ChronicleChips refs={st.chronicle} onChapter={onChapter} />
              {st.sourceId && sourceById.get(st.sourceId) && (
                <button className="cite" onClick={() => onSource(st.sourceId!)}>
                  {sourceById.get(st.sourceId)!.authors} ({sourceById.get(st.sourceId)!.year})
                </button>
              )}
            </div>
          ))}
        </>
      )}
      {p.chronicle && !p.stories?.some((s) => s.chronicle) && <ChronicleChips refs={p.chronicle} onChapter={onChapter} />}
      {seatOf.length > 0 && (
        <>
          <h3>Seat of {seatOf.length} ruler{seatOf.length > 1 ? 's' : ''}</h3>
          <div className="ruler-chips">
            {seatOf.map((r) => (
              <button key={r.id} className="chip small" onClick={() => onRuler(r.id)}>
                {r.name}
              </button>
            ))}
          </div>
        </>
      )}
      <h3>Events through time ({evs.length})</h3>
      {evs.map((e) => (
        <EventRow key={e.id} e={e} onSelect={onSelect} />
      ))}
      {p.kind !== 'region' && (
        <>
          <h3>Media & further reading</h3>
          <WikiCard title={p.wiki} query={`${p.name.replace(/\(.*\)/, '')} Sri Lanka`} name={p.name.replace(/\(.*\)/, '').trim().split(/[ ,]/)[0]} />
        </>
      )}
    </article>
  )
}

export function Bibliography({ focus, onSelect }: { focus?: string; onSelect: (id: string) => void }) {
  const sorted = [...sources].sort((a, b) => a.authors.localeCompare(b.authors))
  return (
    <div className="bibliography">
      <h2>Bibliography ({sources.length})</h2>
      <p className="muted">Each source is linked to the events that cite it. Primary sources are editions or translations of original texts, inscriptions and documents.</p>
      {sorted.map((s) => {
        const evs = eventsBySource.get(s.id) ?? []
        return (
          <div key={s.id} id={`src-${s.id}`} className={`bib-entry${focus === s.id ? ' focus' : ''}`}>
            <span className={`badge kind-${s.kind}`}>{s.kind}</span> {citation(s)}
            {s.doi && (
              <>
                {' '}
                <a href={`https://doi.org/${s.doi}`} target="_blank" rel="noreferrer">
                  doi:{s.doi}
                </a>
              </>
            )}
            {s.url && (
              <>
                {' '}
                <a href={s.url} target="_blank" rel="noreferrer">
                  link
                </a>
              </>
            )}
            {s.notes && <div className="muted small">{s.notes}</div>}
            {evs.length > 0 && (
              <div className="cited-by">
                Cited by:{' '}
                {evs.map((e, i) => (
                  <span key={e.id}>
                    {i > 0 && ', '}
                    <a href={`#event=${e.id}`} onClick={(ev) => (ev.preventDefault(), onSelect(e.id))}>
                      {e.title}
                    </a>
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function About() {
  return (
    <div className="about">
      <h2>About this atlas</h2>
      <p>
        A scholarly, evidence-first atlas of Sri Lankan history from the Palaeolithic to the present. Every entry is mapped to one or more places and supported by cited evidence, and each carries an explicit
        confidence rating.
      </p>
      <h3>Confidence levels</h3>
      <dl>
        {Object.entries(CONFIDENCE_META).map(([k, v]) => (
          <div key={k}>
            <dt>
              <span className={`badge conf-${k}`}>{v.label}</span>
            </dt>
            <dd>{v.description}</dd>
          </div>
        ))}
      </dl>
      <h3>Reading the map and timeline</h3>
      <ul>
        <li>The timeline is <strong>non-linear</strong>: vertical guide lines mark where the scale changes, so deep prehistory and recent decades both stay legible.</li>
        <li>The shaded band is the active time window. The map shows only places with events in that window.</li>
        <li>★ markers show seats of power active at the cursor date.</li>
        <li>Dashed circles are approximate locations; large faint circles are regions.</li>
        <li>Dashed timeline dots are traditional or legendary entries.</li>
        <li>Dates in deep prehistory are shown as BP (years before 1950).</li>
      </ul>
      <h3>Status</h3>
      <p>
        The current entries are an <strong>unreviewed seed dataset</strong>. Citations point to real, standard works, but chapter, page and figure details must be checked against the sources themselves before any
        entry is marked reviewed. See <code>docs/METHODOLOGY.md</code> and <code>docs/CONTRIBUTING.md</code>.
      </p>
    </div>
  )
}
