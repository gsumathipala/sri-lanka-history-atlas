import { useEffect } from 'react'
import type { Tour, TourStep } from '../types'
import { placeById, relicById } from '../lib/data'
import { formatYear } from '../lib/time'
import { ChronicleChips } from './Knowledge'
import toursJson from '../data/tours.json'

/** Tours; a tour with `relic` gets its steps from that relic's journey. */
export const tours: Tour[] = (toursJson as Tour[]).map((t) => {
  if (!t.relic || t.steps.length) return t
  const r = relicById.get(t.relic)
  if (!r) return t
  return {
    ...t,
    steps: r.stations.map(
      (s): TourStep => ({
        title: `${placeById.get(s.placeId)?.name ?? s.placeId} (${s.label ?? formatYear(s.start)})`,
        text: s.note,
        year: s.start,
        placeId: s.placeId,
        relicId: r.id,
        chronicle: s.chronicle,
      }),
    ),
  }
})
export const tourById = new Map(tours.map((t) => [t.id, t]))

export function ToursPanel({ onStart }: { onStart: (id: string) => void }) {
  return (
    <div>
      <h2>Guided tours</h2>
      <p className="muted">Narrated journeys. The map, timeline and panels move together, and each stop links to its sources and chronicle passages.</p>
      {tours.map((t) => (
        <button key={t.id} className="event-row" onClick={() => onStart(t.id)}>
          <span className="dot" style={{ background: t.color }} />
          <span className="event-row-body">
            <span className="event-row-title">{t.title}</span>
            <span className="event-row-meta">
              {t.steps.length} stops · {t.summary}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

export function TourPlayer({
  tour,
  step,
  playing,
  onStep,
  onPlay,
  onExit,
  onChapter,
  onEvent,
  onPlace,
}: {
  tour: Tour
  step: number
  playing: boolean
  onStep: (i: number) => void
  onPlay: (p: boolean) => void
  onExit: () => void
  onChapter: (k: string) => void
  onEvent: (id: string) => void
  onPlace: (id: string) => void
}) {
  const s = tour.steps[step]
  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => (step < tour.steps.length - 1 ? onStep(step + 1) : onPlay(false)), 9000)
    return () => clearTimeout(t)
  }, [playing, step, tour, onStep, onPlay])
  if (!s) return null
  const place = s.placeId ? placeById.get(s.placeId) : undefined
  return (
    <article className="detail tour" style={{ borderTop: `4px solid ${tour.color}` }}>
      <div className="detail-cat" style={{ color: tour.color }}>
        Tour · {tour.title} · stop {step + 1} of {tour.steps.length}
      </div>
      <h2>{s.title}</h2>
      <div className="detail-date">{formatYear(s.year)}</div>
      <p>{s.text}</p>
      <ChronicleChips refs={s.chronicle} onChapter={onChapter} />
      <div className="tour-links">
        {place && (
          <button className="chip" onClick={() => onPlace(place.id)}>
            📍 {place.name}
          </button>
        )}
        {s.eventId && (
          <button className="chip" onClick={() => onEvent(s.eventId!)}>
            📄 Evidence for this event
          </button>
        )}
      </div>
      <div className="tour-controls">
        <button onClick={() => onStep(Math.max(0, step - 1))} disabled={step === 0}>
          ◀ Back
        </button>
        <button onClick={() => onPlay(!playing)}>{playing ? '❚❚ Pause' : '▶ Autoplay'}</button>
        <button onClick={() => onStep(Math.min(tour.steps.length - 1, step + 1))} disabled={step === tour.steps.length - 1}>
          Next ▶
        </button>
        <button onClick={onExit}>✕ End tour</button>
      </div>
      <ol className="tour-steps">
        {tour.steps.map((x, i) => (
          <li key={i} className={i === step ? 'current' : ''}>
            <a href="#" onClick={(e) => (e.preventDefault(), onStep(i))}>
              {x.title}
            </a>
          </li>
        ))}
      </ol>
    </article>
  )
}
