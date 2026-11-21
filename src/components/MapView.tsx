import { useEffect } from 'react'
import { CircleMarker, ImageOverlay, LayersControl, MapContainer, Marker, Polygon, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { HistEvent, Period, Place, Region, Relic } from '../types'
import { CATEGORY_META, RELIGION_COLOR, SITE_SYMBOL, placeById } from '../lib/data'

interface Props {
  events: HistEvent[]
  selected?: HistEvent
  selectedPlaceId?: string
  capitals: Period[]
  sites: Place[]
  regions: Region[]
  relic?: Relic
  relicCurrent: number
  overlay?: { file: string; bounds: [[number, number], [number, number]] }
  overlayOpacity: number
  onPlace: (id: string) => void
}

const CUSTOM_TILES = import.meta.env.VITE_TILE_URL as string | undefined
const CUSTOM_ATTR = (import.meta.env.VITE_TILE_ATTRIBUTION as string | undefined) ?? ''

const stationIcon = (n: number, color: string, current: boolean) =>
  L.divIcon({
    className: 'site-icon',
    html: `<div class="station${current ? ' current' : ''}" style="--c:${color}">${n}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })

const siteIcon = (p: Place, active: boolean) =>
  L.divIcon({
    className: 'site-icon',
    html: `<div class="site${active ? ' active' : ''}" style="--c:${p.religion ? RELIGION_COLOR[p.religion] : '#555'}">${SITE_SYMBOL[p.siteType!]}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })

const capitalIcon = (color: string, name: string) =>
  L.divIcon({
    className: 'capital-icon',
    html: `<div class="capital" style="--c:${color}"><span>★</span><b>${name}</b></div>`,
    iconSize: [0, 0],
  })

function FlyTo({ selected, placeId }: { selected?: HistEvent; placeId?: string }) {
  const map = useMap()
  useEffect(() => {
    const ids = selected ? selected.placeIds : placeId ? [placeId] : []
    const pts = ids.map((id) => placeById.get(id)).filter((p) => p && p.id !== 'island')
    if (!pts.length) return
    if (pts.length === 1) map.flyTo([pts[0]!.lat, pts[0]!.lng], Math.max(map.getZoom(), 9), { duration: 0.8 })
    else map.flyToBounds(L.latLngBounds(pts.map((p) => [p!.lat, p!.lng])), { padding: [60, 60], maxZoom: 10, duration: 0.8 })
  }, [selected, placeId, map])
  return null
}

export default function MapView({ events, selected, selectedPlaceId, capitals, sites, regions, relic, relicCurrent, overlay, overlayOpacity, onPlace }: Props) {
  // aggregate visible events per place
  const byPlace = new Map<string, HistEvent[]>()
  for (const e of events) for (const p of e.placeIds) byPlace.set(p, [...(byPlace.get(p) ?? []), e])
  const highlight = new Set(selected?.placeIds ?? (selectedPlaceId ? [selectedPlaceId] : []))

  return (
    <MapContainer center={[7.85, 80.75]} zoom={7.75} zoomSnap={0.25} minZoom={7} maxBounds={[[4.5, 77.5], [11, 84]]} className="map" zoomControl>
      <LayersControl position="topright">
        {CUSTOM_TILES && (
          <LayersControl.BaseLayer checked name="Custom basemap">
            <TileLayer url={CUSTOM_TILES} attribution={CUSTOM_ATTR} />
          </LayersControl.BaseLayer>
        )}
        <LayersControl.BaseLayer checked={!CUSTOM_TILES} name="Streets (OpenStreetMap)">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Terrain (OpenTopoMap)">
          <TileLayer attribution='&copy; OpenStreetMap contributors, SRTM | style &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)' url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" maxZoom={17} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite (Esri)">
          <TileLayer attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
        </LayersControl.BaseLayer>
      </LayersControl>

      {overlay && <ImageOverlay key={overlay.file} url={`${import.meta.env.BASE_URL}${overlay.file}`} bounds={overlay.bounds} opacity={overlayOpacity} zIndex={250} />}

      {regions.map((g) => (
        <Polygon key={g.id} positions={g.polygons} pathOptions={{ color: g.color, weight: 1.5, dashArray: '6 4', fillColor: g.color, fillOpacity: 0.1 }} interactive>
          <Tooltip sticky>
            <strong>{g.name}</strong> <em>(schematic)</em>
            <div style={{ maxWidth: 260, whiteSpace: 'normal' }}>{g.note}</div>
          </Tooltip>
        </Polygon>
      ))}

      {relic && relic.journey && (
        <Polyline
          positions={relic.stations.map((st) => placeById.get(st.placeId)).filter(Boolean).map((p) => [p!.lat, p!.lng] as [number, number])}
          pathOptions={{ color: relic.color, weight: 3, dashArray: '8 6', opacity: 0.85 }}
        />
      )}
      {relic &&
        relic.stations.map((st, i) => {
          const p = placeById.get(st.placeId)
          if (!p) return null
          return (
            <Marker key={'relic-' + i} position={[p.lat, p.lng]} icon={stationIcon(i + 1, relic.color, i === relicCurrent)} zIndexOffset={500} eventHandlers={{ click: () => onPlace(p.id) }}>
              <Tooltip direction="top" offset={[0, -10]}>
                <strong>
                  {i + 1}. {p.name}
                </strong>{' '}
                {st.label}
                <div style={{ maxWidth: 240, whiteSpace: 'normal' }}>{st.note}</div>
              </Tooltip>
            </Marker>
          )
        })}
      <FlyTo selected={selected} placeId={selectedPlaceId} />

      {sites.map((p) => (
        <Marker key={'site-' + p.id} position={[p.lat, p.lng]} icon={siteIcon(p, highlight.has(p.id))} eventHandlers={{ click: () => onPlace(p.id) }} zIndexOffset={-100}>
          <Tooltip direction="top" offset={[0, -8]}>
            <strong>{p.name}</strong>
            {p.foundedLabel && <div>{p.foundedLabel}</div>}
            {p.stories?.[0] && <div style={{ maxWidth: 240, whiteSpace: 'normal' }}>{p.stories[0].title}</div>}
          </Tooltip>
        </Marker>
      ))}

      {capitals.map((p) => {
        const place = p.capitalPlaceId ? placeById.get(p.capitalPlaceId) : undefined
        if (!place) return null
        return (
          <Marker key={p.id} position={[place.lat, place.lng]} icon={capitalIcon(p.color, p.name)} eventHandlers={{ click: () => onPlace(place.id) }}>
            <Tooltip direction="top" offset={[0, -8]}>
              Seat of power: {p.name} ({place.name})
            </Tooltip>
          </Marker>
        )
      })}

      {[...byPlace.entries()].map(([pid, evs]) => {
        const place = placeById.get(pid)
        if (!place) return null
        const hl = highlight.has(pid)
        const color = CATEGORY_META[evs[evs.length - 1].category].color
        const region = place.precision === 'region'
        return (
          <CircleMarker
            key={pid}
            center={[place.lat, place.lng]}
            radius={(region ? 16 : 6 + Math.min(8, evs.length * 1.5)) + (hl ? 3 : 0)}
            pathOptions={{
              color: hl ? '#111' : color,
              weight: hl ? 3 : 1.5,
              fillColor: color,
              fillOpacity: region ? 0.12 : 0.7,
              dashArray: place.precision === 'exact' ? undefined : '4 3',
            }}
            eventHandlers={{ click: () => onPlace(pid) }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <strong>{place.name}</strong>
              {place.precision !== 'exact' && <em> ({place.precision} location)</em>}
              <br />
              {evs.slice(0, 4).map((e) => (
                <div key={e.id}>• {e.title}</div>
              ))}
              {evs.length > 4 && <div>+ {evs.length - 4} more</div>}
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
