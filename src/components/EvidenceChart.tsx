import { useState } from 'react'
import type { EvidenceType } from '../types'
import { events, periods } from '../lib/data'

/** Composition of the evidence base in each era: which kinds of evidence the entries rest on. */
const GROUPS: { id: string; label: string; types: EvidenceType[] }[] = [
  { id: 'material', label: 'Material (archaeology, dating, monuments, coins, science)', types: ['archaeological', 'radiometric', 'architectural', 'numismatic', 'scientific'] },
  { id: 'inscriptions', label: 'Inscriptions', types: ['epigraphic'] },
  { id: 'chronicles', label: 'Chronicles & tradition', types: ['chronicle', 'oral-tradition'] },
  { id: 'documents', label: 'Documents & foreign accounts', types: ['archival', 'legal-official', 'foreign-account', 'contemporary-report'] },
  { id: 'synthesis', label: 'Modern synthesis only', types: ['synthesis'] },
]
const groupOf = (t: EvidenceType) => GROUPS.findIndex((g) => g.types.includes(t))

export function EvidenceChart() {
  const [table, setTable] = useState(false)
  const [tip, setTip] = useState<{ x: number; y: number; text: string }>()
  const eras = periods.filter((p) => p.track === 'era')
  const rows = eras.map((era) => {
    const counts = GROUPS.map(() => 0)
    for (const e of events) {
      if (e.start < era.start || e.start >= (era.id === 'post-independence' ? 9999 : era.end)) continue
      for (const ev of e.evidence) counts[groupOf(ev.type)]++
    }
    const total = counts.reduce((a, b) => a + b, 0)
    return { era, counts, total }
  })
  return (
    <figure className="viz-root evchart" aria-label="Kinds of evidence per era">
      <figcaption>
        <strong>Where the evidence comes from</strong>
        <span className="muted small"> Share of evidence items by kind, per era (n = items)</span>
      </figcaption>
      <div className="evlegend">
        {GROUPS.map((g, i) => (
          <span key={g.id}>
            <i style={{ background: `var(--series-${i + 1})` }} /> {g.label}
          </span>
        ))}
      </div>
      {!table ? (
        <div className="evbars" onMouseLeave={() => setTip(undefined)}>
          {rows.map((r) => (
            <div key={r.era.id} className="evrow">
              <span className="evlabel">{r.era.name.replace(/\s*\(.*\)/, '')}</span>
              <span className="evtrack">
                {r.counts.map((c, i) =>
                  c ? (
                    <span
                      key={i}
                      className="evseg"
                      style={{ flexGrow: c, background: `var(--series-${i + 1})` }}
                      onMouseMove={(ev) => setTip({ x: ev.clientX, y: ev.clientY, text: `${r.era.name}: ${GROUPS[i].label}: ${c} of ${r.total} (${Math.round((100 * c) / r.total)}%)` })}
                    />
                  ) : null,
                )}
              </span>
              <span className="evn">n = {r.total}</span>
            </div>
          ))}
        </div>
      ) : (
        <table className="evtable">
          <thead>
            <tr>
              <th>Era</th>
              {GROUPS.map((g) => (
                <th key={g.id}>{g.label.split(' (')[0]}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.era.id}>
                <td>{r.era.name}</td>
                {r.counts.map((c, i) => (
                  <td key={i}>{c}</td>
                ))}
                <td>{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button className="chip small" onClick={() => setTable(!table)}>
        {table ? 'Show chart' : 'Show as table'}
      </button>
      {tip && (
        <div className="evtip" style={{ left: tip.x + 12, top: tip.y + 12 }}>
          {tip.text}
        </div>
      )}
      <p className="muted small">Read with care: the totals reflect what has been entered so far, not the full surviving record. A large "modern synthesis only" share marks where primary evidence still needs adding.</p>
    </figure>
  )
}
