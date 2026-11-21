import type { Relic } from '../types'
import { placeById, relics, sourceById } from '../lib/data'
import { formatYear } from '../lib/time'
import { ChronicleChips, WikiCard } from './Knowledge'

const KIND_LABEL: Record<Relic['kind'], string> = {
  saririka: 'Sarira (bodily relic)',
  paribhogika: 'Paribhogika (relic of use)',
  uddesika: 'Uddesika (commemorative)',
}

/** Index of the station current at a given year (journeys only). */
export function currentStation(r: Relic, year: number): number {
  if (!r.journey) return -1
  let idx = -1
  r.stations.forEach((s, i) => {
    if (s.start <= year) idx = i
  })
  return idx
}

export function RelicsPanel({ onRelic }: { onRelic: (id: string) => void }) {
  return (
    <div>
      <h2>Relics</h2>
      <p className="muted">
        Relics in Theravada are of three kinds: bodily (sarira), objects the Buddha used (paribhogika, which includes the Bodhi tree), and commemorative (uddesika). Select one to draw its journey or shrines on the
        map.
      </p>
      {relics.map((r) => (
        <button key={r.id} className="event-row" onClick={() => onRelic(r.id)}>
          <span className="dot" style={{ background: r.color }} />
          <span className="event-row-body">
            <span className="event-row-title">{r.name}</span>
            <span className="event-row-meta">
              {KIND_LABEL[r.kind]} · {r.stations.length} {r.journey ? 'stations on its journey' : 'shrines'}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

export function RelicDetail({ r, year, onPlace, onChapter, onYear, onSource }: { r: Relic; year: number; onPlace: (id: string) => void; onChapter: (k: string) => void; onYear: (y: number) => void; onSource: (id: string) => void }) {
  const cur = currentStation(r, year)
  return (
    <article className="detail">
      <div className="detail-cat" style={{ color: r.color }}>
        Relic · {KIND_LABEL[r.kind]}
      </div>
      <h2>{r.name}</h2>
      {r.altNames && <p className="muted">Also: {r.altNames.join(', ')}</p>}
      <p>{r.summary}</p>
      {r.historiography && <p className="historiography">{r.historiography}</p>}
      <h3>{r.journey ? 'Journey' : 'Shrines'}</h3>
      <ol className="stations">
        {r.stations.map((s, i) => {
          const p = placeById.get(s.placeId)
          return (
            <li key={i} className={i === cur ? 'current' : ''}>
              <div className="station-head">
                <button className="chip small" onClick={() => onYear(s.start)}>
                  ⏱ {s.label ?? formatYear(s.start)}
                </button>{' '}
                <a href="#" onClick={(e) => (e.preventDefault(), onPlace(s.placeId))}>
                  {p?.name}
                </a>{' '}
                <span className={`badge basis-${s.basis}`}>{s.basis}</span>
                {i === cur && <span className="badge here">here at {formatYear(year)}</span>}
              </div>
              <div>{s.note}</div>
              <ChronicleChips refs={s.chronicle} onChapter={onChapter} />
              {s.sourceId && sourceById.get(s.sourceId) && (
                <button className="cite" onClick={() => onSource(s.sourceId!)}>
                  {sourceById.get(s.sourceId)!.authors} ({sourceById.get(s.sourceId)!.year})
                </button>
              )}
            </li>
          )
        })}
      </ol>
      {r.wiki && (
        <>
          <h3>Media & further reading</h3>
          <WikiCard title={r.wiki} query={r.name} />
        </>
      )}
    </article>
  )
}
