#!/usr/bin/env node
/**
 * Merge reviewer files exported from the app (Sources -> Export my reviews) into the dataset.
 *   node scripts/apply-reviews.mjs reviews.json [more.json ...]
 * - "reviewed" with every evidence item checked -> review.status = reviewed (+ reviewer, date, notes)
 * - corrected locators are written back to the evidence items
 * - "needs-changes" -> status stays draft, reviewer notes recorded for follow-up
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'events')
const files = process.argv.slice(2)
if (!files.length) {
  console.error('usage: node scripts/apply-reviews.mjs reviews.json [...]')
  process.exit(1)
}
const reviews = files.flatMap((f) => JSON.parse(readFileSync(f, 'utf8')))
const byId = new Map(reviews.map((r) => [r.eventId, r]))
let applied = 0
let flagged = 0
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const path = join(dir, f)
  const events = JSON.parse(readFileSync(path, 'utf8'))
  let changed = false
  for (const e of events) {
    const r = byId.get(e.id)
    if (!r) continue
    if (r.evidence.length !== e.evidence.length) {
      console.warn(`skip ${e.id}: evidence list changed since review`)
      continue
    }
    r.evidence.forEach((c, i) => {
      if (c.locator && c.locator !== e.evidence[i].locator) e.evidence[i].locator = c.locator
    })
    if (r.decision === 'reviewed' && r.evidence.every((c) => c.checked)) {
      e.review = { status: 'reviewed', reviewer: r.reviewer, date: r.date, ...(r.notes ? { notes: r.notes } : {}) }
      applied++
    } else {
      e.review = { ...e.review, status: 'draft', notes: `[${r.reviewer}, ${r.date}] ${r.notes}`.trim() }
      flagged++
    }
    changed = true
  }
  if (changed) writeFileSync(path, JSON.stringify(events, null, 2) + '\n')
}
console.log(`${applied} entries marked reviewed, ${flagged} flagged for changes`)
