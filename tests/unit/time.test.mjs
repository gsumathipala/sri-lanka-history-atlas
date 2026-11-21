import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MIN_YEAR, MAX_YEAR, formatYear, posToYear, yearToPos } from '../../src/lib/time.ts'

test('time scale round-trips within a year across the whole range', () => {
  for (let p = 0; p <= 1; p += 0.0025) {
    const y = posToYear(p)
    assert.ok(Math.abs(yearToPos(y) - p) < 1e-9, `pos ${p}`)
  }
})
test('time scale is monotonic and spans the full range', () => {
  let prev = -Infinity
  for (let y = MIN_YEAR; y <= MAX_YEAR; y += 137) {
    const p = yearToPos(y)
    assert.ok(p > prev, `monotonic at ${y}`)
    prev = p
  }
  assert.equal(yearToPos(MIN_YEAR), 0)
  assert.equal(yearToPos(MAX_YEAR), 1)
})
test('year formatting: BP for deep prehistory, BCE/CE, plain modern years', () => {
  assert.equal(formatYear(-46050), '48,000 BP')
  assert.equal(formatYear(-250), '250 BCE')
  assert.equal(formatYear(410), '410 CE')
  assert.equal(formatYear(1948), '1948')
})
