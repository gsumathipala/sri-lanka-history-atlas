import { useEffect, useState } from 'react'
import { places } from '../lib/data'

const R = 6371
function km(a: [number, number], b: [number, number]) {
  const toR = Math.PI / 180
  const dLat = (b[0] - a[0]) * toR
  const dLng = (b[1] - a[1]) * toR
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
const DEMO: Record<string, [number, number]> = { Anuradhapura: [8.3456, 80.3964], Kandy: [7.2936, 80.6413], Galle: [6.0269, 80.217], Jaffna: [9.6615, 80.0255], Polonnaruwa: [7.9403, 81.0003] }

/** On-site guide: nearest sites to the visitor (location never leaves the browser). */
export function NearPanel({ onPlace }: { onPlace: (id: string) => void }) {
  const [pos, setPos] = useState<[number, number]>()
  const [status, setStatus] = useState('Finding your location…')
  useEffect(() => {
    if (!navigator.geolocation) return setStatus('Location is not available in this browser.')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos([p.coords.latitude, p.coords.longitude])
        setStatus('')
      },
      () => setStatus('Location permission was not given. Choose a place to try the guide:'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])
  const far = pos && km(pos, [7.87, 80.77]) > 300
  const list = pos
    ? places
        .filter((p) => p.kind !== 'region')
        .map((p) => ({ p, d: km(pos, [p.lat, p.lng]) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 20)
    : []
  return (
    <div>
      <h2>Near me</h2>
      <p className="muted small">Your location is used only in this browser and is never sent anywhere.</p>
      {status && <p>{status}</p>}
      {far && <p className="note">You appear to be outside Sri Lanka. Try the guide at one of these places instead:</p>}
      {(status || far) && (
        <div className="tour-links">
          {Object.entries(DEMO).map(([n, c]) => (
            <button key={n} className="chip" onClick={() => (setPos(c), setStatus(''))}>
              {n}
            </button>
          ))}
        </div>
      )}
      {!far &&
        list.map(({ p, d }) => (
          <button key={p.id} className="event-row" onClick={() => onPlace(p.id)}>
            <span className="event-row-body">
              <span className="event-row-title">
                {p.name} <span className="muted small">{d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`}</span>
              </span>
              <span className="event-row-meta">
                {p.siteType ?? p.kind}
                {p.foundedLabel ? ` · ${p.foundedLabel}` : ''}
                {p.stories?.length ? ` · ${p.stories.length} stor${p.stories.length > 1 ? 'ies' : 'y'}` : ''}
              </span>
            </span>
          </button>
        ))}
    </div>
  )
}
