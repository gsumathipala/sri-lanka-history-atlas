import { useEffect, useMemo, useRef, useState } from 'react'
import type { HistEvent, Period, Ruler } from '../types'
import { AXIS_TICKS, formatYear, posToYear, segmentBoundaries, yearToPos } from '../lib/time'
import { CATEGORY_META, POLITY_META, periods, rulers } from '../lib/data'

interface Props {
  pos: number
  windowHalf: number
  showAll: boolean
  events: HistEvent[]
  selectedId?: string
  onPos: (p: number) => void
  onSelect: (id: string) => void
  onRuler: (id: string) => void
}

/** Rulers strip: one lane per polity group, so successions read left to right. */
const RULER_LANES: Record<string, number> = { anuradhapura: 0, ruhuna: 1, chola: 1, polonnaruwa: 0, dambadeniya: 0, gampola: 0, kotte: 0, sitawaka: 1, kandy: 2, jaffna: 3, portuguese: 4, dutch: 4, british: 4, dominion: 4, republic: 4 }
const RULER_ROWS = 5
const RULER_H = 5
const headOfState = (r: Ruler) => r.role !== 'prime-minister'

const PAD = 30
const TRACK_H = 16
const TRACKS: Period['track'][] = ['era', 'polity', 'foreign']
const TRACK_LABEL: Record<Period['track'], string> = { era: 'Era', polity: 'Polities', foreign: 'Foreign rule' }

/** Greedy lane assignment so overlapping periods in a track stack. */
function lanes(list: Period[]): Map<string, number> {
  const ends: number[] = []
  const out = new Map<string, number>()
  for (const p of [...list].sort((a, b) => a.start - b.start)) {
    let lane = ends.findIndex((e) => e <= p.start)
    if (lane === -1) lane = ends.length
    ends[lane] = p.end
    out.set(p.id, lane)
  }
  return out
}

export default function Timeline({ pos, windowHalf, showAll, events, selectedId, onPos, onSelect, onRuler }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1000)
  const dragging = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const inner = Math.max(100, width - PAD * 2)
  const x = (year: number) => PAD + yearToPos(year) * inner

  const layout = useMemo(() => {
    let y = 4
    const rows: { track: Period['track']; y: number; lanes: Map<string, number>; items: Period[] }[] = []
    for (const t of TRACKS) {
      const items = periods.filter((p) => p.track === t)
      const l = lanes(items)
      const n = Math.max(1, ...[...l.values()].map((v) => v + 1))
      rows.push({ track: t, y, lanes: l, items })
      y += n * (TRACK_H + 2) + 6
    }
    const rulersY = y
    y += RULER_ROWS * (RULER_H + 1) + 6
    return { rows, rulersY, eventsY: y + 4, height: y + 4 + 46 + 22 }
  }, [])

  // stack event dots that would overlap
  const dots = useMemo(() => {
    const placed: { e: HistEvent; cx: number; row: number }[] = []
    const lastX: number[] = []
    for (const e of events) {
      const cx = x(e.start)
      let row = 0
      while (lastX[row] !== undefined && cx - lastX[row] < 7 && row < 4) row++
      lastX[row] = cx
      placed.push({ e, cx, row })
    }
    return placed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, inner])

  const ticks = useMemo(() => {
    const out: number[] = []
    let last = -Infinity
    for (const t of AXIS_TICKS) {
      const tx = x(t)
      if (tx - last > 56) {
        out.push(t)
        last = tx
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inner])

  function setFromClient(clientX: number) {
    const r = ref.current!.getBoundingClientRect()
    onPos((clientX - r.left - PAD) / inner)
  }

  const cursorX = PAD + pos * inner
  const wl = PAD + Math.max(0, pos - windowHalf) * inner
  const wr = PAD + Math.min(1, pos + windowHalf) * inner
  const { eventsY, height } = layout

  return (
    <div
      className="timeline"
      ref={ref}
      onPointerDown={(ev) => {
        if ((ev.target as Element).closest('[data-event]')) return
        dragging.current = true
        ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
        setFromClient(ev.clientX)
      }}
      onPointerMove={(ev) => dragging.current && setFromClient(ev.clientX)}
      onPointerUp={() => (dragging.current = false)}
      role="slider"
      aria-label="Timeline position"
      aria-valuetext={formatYear(posToYear(pos))}
      aria-valuenow={Math.round(posToYear(pos))}
      tabIndex={0}
      onKeyDown={(ev) => {
        if (ev.key === 'ArrowRight') onPos(pos + 0.004)
        if (ev.key === 'ArrowLeft') onPos(pos - 0.004)
      }}
    >
      <svg width={width} height={height}>
        {/* segment boundaries signal the non-linear scale */}
        {segmentBoundaries().map((b) => (
          <line key={b} x1={x(b)} x2={x(b)} y1={0} y2={height - 20} className="seg-line" />
        ))}

        {layout.rows.map((row) => (
          <g key={row.track}>
            <text x={PAD} y={row.y + 11} className="track-label">
              {TRACK_LABEL[row.track]}
            </text>
            {row.items.map((p) => {
              const x0 = x(p.start)
              const w = Math.max(2, x(p.end) - x0)
              const yy = row.y + (row.lanes.get(p.id) ?? 0) * (TRACK_H + 2)
              return (
                <g key={p.id}>
                  <title>{`${p.name} (${formatYear(p.start)} – ${formatYear(p.end)})\n${p.description}`}</title>
                  <rect x={x0} y={yy} width={w} height={TRACK_H} rx={3} fill={p.color} opacity={0.85} />
                  {w > 50 && (
                    <text x={x0 + 4} y={yy + 11.5} className="period-label">
                      {p.name.length * 6 > w ? p.name.slice(0, Math.floor(w / 6.2)) + '…' : p.name}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        ))}

        <text x={2} y={layout.rulersY + 8} className="track-label">
          Rulers
        </text>
        {rulers.filter(headOfState).map((r) => {
          const x0 = x(r.start)
          const w = Math.max(1, x(r.end) - x0 - 0.5)
          const yy = layout.rulersY + (RULER_LANES[r.polity] ?? 4) * (RULER_H + 1)
          return (
            <rect key={r.id} data-event x={x0} y={yy} width={w} height={RULER_H} fill={POLITY_META[r.polity]?.color ?? '#888'} className="ruler-seg" onClick={() => onRuler(r.id)}>
              <title>{`${r.name} (${formatYear(r.start)} – ${formatYear(r.end)})`}</title>
            </rect>
          )
        })}

        {!showAll && <rect x={wl} y={0} width={Math.max(2, wr - wl)} height={height - 20} className="window" />}

        {dots.map(({ e, cx, row }) => {
          const x1 = e.end !== undefined ? x(e.end) : cx
          const cy = eventsY + 8 + row * 9
          const sel = e.id === selectedId
          return (
            <g key={e.id} data-event onClick={() => onSelect(e.id)} className="event-dot">
              <title>{`${e.title} (${e.dateLabel ?? formatYear(e.start)})`}</title>
              {x1 - cx > 3 && <line x1={cx} x2={x1} y1={cy} y2={cy} stroke={CATEGORY_META[e.category].color} strokeWidth={3} opacity={0.35} />}
              <circle
                cx={cx}
                cy={cy}
                r={sel ? 6 : 4}
                fill={CATEGORY_META[e.category].color}
                stroke={sel ? 'var(--fg)' : 'var(--bg)'}
                strokeWidth={sel ? 2 : 1}
                strokeDasharray={e.confidence === 'legendary' || e.confidence === 'traditional' ? '2 1.5' : undefined}
              />
            </g>
          )
        })}

        <line x1={PAD} x2={PAD + inner} y1={height - 20} y2={height - 20} className="axis" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={height - 20} y2={height - 15} className="axis" />
            <text x={x(t)} y={height - 4} textAnchor="middle" className="tick">
              {formatYear(t)}
            </text>
          </g>
        ))}

        <line x1={cursorX} x2={cursorX} y1={0} y2={height - 20} className="cursor" />
        <circle cx={cursorX} cy={height - 20} r={6} className="cursor-knob" />
      </svg>
    </div>
  )
}
