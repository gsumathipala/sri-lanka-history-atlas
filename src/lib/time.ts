/**
 * Piecewise-linear "historical" time scale.
 *
 * 130,000 years of prehistory and 80 years of modern history both need room
 * on screen, so each segment gets a share of the timeline width proportional
 * to its weight, not to its duration.
 */

import { tr } from './i18n'

export const MIN_YEAR = -128050 // c. 130,000 BP
export const MAX_YEAR = 2026

interface Segment {
  from: number
  to: number
  weight: number
}

const SEGMENTS: Segment[] = [
  { from: MIN_YEAR, to: -10000, weight: 0.9 },
  { from: -10000, to: -1000, weight: 0.45 },
  { from: -1000, to: 1, weight: 1.6 },
  { from: 1, to: 1000, weight: 1.5 },
  { from: 1000, to: 1500, weight: 1.3 },
  { from: 1500, to: 1800, weight: 1.4 },
  { from: 1800, to: 1948, weight: 1.3 },
  { from: 1948, to: MAX_YEAR, weight: 1.5 },
]

const TOTAL = SEGMENTS.reduce((s, x) => s + x.weight, 0)
const BOUNDS = (() => {
  let acc = 0
  return SEGMENTS.map((s) => {
    const start = acc / TOTAL
    acc += s.weight
    return { ...s, p0: start, p1: acc / TOTAL }
  })
})()

/** Year -> position in [0, 1]. */
export function yearToPos(year: number): number {
  const y = Math.min(MAX_YEAR, Math.max(MIN_YEAR, year))
  const seg = BOUNDS.find((s) => y <= s.to) ?? BOUNDS[BOUNDS.length - 1]
  return seg.p0 + ((y - seg.from) / (seg.to - seg.from)) * (seg.p1 - seg.p0)
}

/** Position in [0, 1] -> year. */
export function posToYear(pos: number): number {
  const p = Math.min(1, Math.max(0, pos))
  const seg = BOUNDS.find((s) => p <= s.p1) ?? BOUNDS[BOUNDS.length - 1]
  return seg.from + ((p - seg.p0) / (seg.p1 - seg.p0)) * (seg.to - seg.from)
}

export function segmentBoundaries(): number[] {
  return SEGMENTS.map((s) => s.from).concat(MAX_YEAR)
}

/** Years before present (1950), for deep prehistory. */
export const toBP = (year: number) => 1950 - year

export function formatYear(year: number): string {
  const y = Math.round(year)
  if (y < -8000) {
    const bp = toBP(y)
    const rounded = bp > 20000 ? Math.round(bp / 1000) * 1000 : Math.round(bp / 100) * 100
    return `${rounded.toLocaleString('en-GB')} BP`
  }
  if (y < 0) return `${(-y).toLocaleString('en-GB')} ${tr('bce')}`
  if (y === 0) return `1 ${tr('ce')}`
  return y < 1000 ? `${y} ${tr('ce')}` : `${y}`
}

export function formatRange(start: number, end?: number): string {
  if (end === undefined || end === start) return formatYear(start)
  return `${formatYear(start)} – ${formatYear(end)}`
}

/** Tick marks for the axis, filtered by caller for spacing. */
export const AXIS_TICKS = [
  -123050, -98050, -73050, -48050, -28050, -10000, -5000, -1000, -500, 1, 500, 1000, 1250, 1500, 1600, 1700, 1800,
  1850, 1900, 1948, 1975, 2000, 2026,
]
