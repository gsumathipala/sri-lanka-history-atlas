import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

maplibregl.setWorkerUrl(workerUrl)
import * as THREE from 'three'
import type { Place } from '../types'
import { placeById, reconByPlace, reconstructions } from '../lib/data'
import { buildReconstruction, phaseAt } from '../lib/reconstruct'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/** Session overrides from the Align tool: placeId -> corrected [lng, lat]. */
export const alignOverrides = new Map<string, [number, number]>()

/** A MapLibre custom layer drawing every reconstruction with three.js, seated on the terrain. */
function reconstructionLayer(map: maplibregl.Map, visible: { current: boolean }, year: number): maplibregl.CustomLayerInterface {
  const items = reconstructions
    .map((r) => ({ r, p: placeById.get(r.placeId)! }))
    .filter((x) => x.p)
    .map((x) => {
      const scene = new THREE.Scene()
      scene.add(new THREE.AmbientLight(0xffffff, 0.75))
      const sun = new THREE.DirectionalLight(0xffffff, 1.6)
      sun.position.set(60, 120, 40)
      scene.add(sun)
      if (x.r.model) {
        // a real model (photogrammetry / scan) takes precedence over the parametric geometry
        new GLTFLoader().load(
          x.r.model.url,
          (gltf) => {
            const o = gltf.scene
            o.scale.setScalar(x.r.model!.scale ?? 1)
            o.rotation.y = ((x.r.model!.rotationDeg ?? 0) * Math.PI) / 180
            scene.add(o)
            map.triggerRepaint()
          },
          undefined,
          () => scene.add(buildReconstruction(x.r, year)),
        )
      } else scene.add(buildReconstruction(x.r, year))
      return { ...x, scene, elev: 0 }
    })
  const camera = new THREE.Camera()
  let renderer: THREE.WebGLRenderer
  const ll = (it: { p: Place }): [number, number] => alignOverrides.get(it.p.id) ?? [it.p.lng, it.p.lat]
  const updateElev = () => {
    for (const it of items) it.elev = map.queryTerrainElevation(ll(it)) ?? 0
    map.triggerRepaint()
  }
  const rotX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2)
  return {
    id: 'reconstructions',
    type: 'custom',
    renderingMode: '3d',
    onAdd(_m, gl) {
      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true })
      renderer.autoClear = false
      map.on('idle', updateElev)
      map.on('terrain', updateElev)
    },
    onRemove() {
      map.off('idle', updateElev)
      map.off('terrain', updateElev)
    },
    render(_gl, args) {
      if (!visible.current) return
      const main = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix as unknown as number[])
      for (const it of items) {
        const mc = maplibregl.MercatorCoordinate.fromLngLat(ll(it), it.elev)
        const s = mc.meterInMercatorCoordinateUnits()
        const l = new THREE.Matrix4().makeTranslation(mc.x, mc.y, mc.z).scale(new THREE.Vector3(s, -s, s)).multiply(rotX)
        camera.projectionMatrix = main.clone().multiply(l)
        renderer.resetState()
        renderer.render(it.scene, camera)
      }
    },
  }
}

/**
 * 3D terrain flyover: satellite imagery draped over a DEM (AWS Terrain Tiles,
 * derived mainly from SRTM ~30 m). Real relief such as rocks, hills and escarpments
 * is shown in 3D; buildings and stupas appear only as imagery.
 */
const IMAGERY = import.meta.env.VITE_FLYOVER_IMAGERY_URL ?? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

export default function Flyover({ place, onClose, year = 2026 }: { place: Place; onClose: () => void; year?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const recon = reconByPlace.get(place.id)
  const [phaseYear, setPhaseYear] = useState(() => {
    // show the monument as it stood at the timeline date (or as built, if the date is before construction)
    const ph = recon?.phases
    if (!ph?.length) return year
    return year < ph[0].from ? ph[0].from : year
  })
  const phase = recon ? phaseAt(recon, phaseYear) : undefined
  const [orbit, setOrbit] = useState(true)
  // monuments are true-scale, so keep relief true-scale when a reconstruction is shown
  const [exag, setExag] = useState(recon ? 1 : 2)
  const [showRecon, setShowRecon] = useState(true)
  const [aligning, setAligning] = useState(false)
  const aligningRef = useRef(aligning)
  aligningRef.current = aligning
  const [aligned, setAligned] = useState<[number, number] | undefined>(alignOverrides.get(place.id))
  const showReconRef = useRef(showRecon)
  showReconRef.current = showRecon
  useEffect(() => {
    mapRef.current?.triggerRepaint()
  }, [showRecon])
  const orbitRef = useRef(orbit)
  orbitRef.current = orbit

  useEffect(() => {
    const map = new maplibregl.Map({
      container: ref.current!,
      style: {
        version: 8,
        sources: {
          sat: { type: 'raster', tiles: [IMAGERY], tileSize: 256, maxzoom: 17, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics and the GIS user community' },
          hs: {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 14,
          },
          dem: {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 14,
            attribution: 'Terrain: AWS Terrain Tiles (Mapzen; SRTM and others)',
          },
        },
        layers: [
          { id: 'sat', type: 'raster', source: 'sat' },
          { id: 'hillshade', type: 'hillshade', source: 'hs', paint: { 'hillshade-exaggeration': 0.45, 'hillshade-shadow-color': '#2a1d10', 'hillshade-illumination-direction': 315 } },
        ],
        terrain: { source: 'dem', exaggeration: recon ? 1 : 2 },
        sky: { 'sky-color': '#9cc3e6', 'horizon-color': '#e8eef4', 'sky-horizon-blend': 0.6, 'fog-color': '#dfe8ef', 'fog-ground-blend': 0.4 },
      },
      center: [place.lng, place.lat],
      zoom: 11,
      pitch: 30,
      bearing: 0,
      maxPitch: 85,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
    const marker = new maplibregl.Marker({ color: '#c2185b' }).setLngLat(alignOverrides.get(place.id) ?? [place.lng, place.lat]).addTo(map)
    map.on('click', (e) => {
      if (!aligningRef.current) return
      const c: [number, number] = [+e.lngLat.lng.toFixed(5), +e.lngLat.lat.toFixed(5)]
      alignOverrides.set(place.id, c)
      marker.setLngLat(c)
      setAligned(c)
      map.fire('terrain')
    })

    let raf = 0
    let flying = true
    map.on('load', () => {
      map.addLayer(reconstructionLayer(map, showReconRef, phaseYear))
      const size = recon?.diameter ?? (recon?.grid ? recon.grid.cols * recon.grid.spacing : 0)
      const zoom = place.precision === 'region' ? 12 : recon ? Math.min(17.6, Math.max(15.8, 18.6 - Math.log2(Math.max(20, size) / 12))) : 15.5
      map.flyTo({ center: [place.lng, place.lat], zoom, pitch: recon ? 62 : 72, bearing: -30, duration: 6000, essential: true })
      map.once('moveend', () => {
        flying = false
      })
      const spin = () => {
        if (!flying && orbitRef.current && !map.isMoving()) map.setBearing(map.getBearing() + 0.08)
        raf = requestAnimationFrame(spin)
      }
      raf = requestAnimationFrame(spin)
    })
    // stop orbiting when the user grabs the map
    map.on('mousedown', () => setOrbit(false))
    map.on('touchstart', () => setOrbit(false))
    return () => {
      cancelAnimationFrame(raf)
      map.remove()
    }
  }, [place])

  useEffect(() => {
    const map = mapRef.current
    if (map?.isStyleLoaded()) map.setTerrain({ source: 'dem', exaggeration: exag })
  }, [exag])
  // rebuild the models when the phase changes
  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('reconstructions')) return
    map.removeLayer('reconstructions')
    map.addLayer(reconstructionLayer(map, showReconRef, phaseYear))
  }, [phaseYear])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="flyover-backdrop" role="dialog" aria-label={`3D flyover of ${place.name}`}>
      <div className="flyover">
        <div className="flyover-bar">
          <strong>3D flyover: {place.name}</strong>
          <button onClick={() => setOrbit(!orbit)}>{orbit ? '❚❚ Stop orbit' : '⟳ Orbit'}</button>
          {recon && (
            <span className="seg">
              <button className={!showRecon ? 'on' : ''} onClick={() => setShowRecon(false)}>
                Today
              </button>
              <button className={showRecon ? 'on' : ''} onClick={() => setShowRecon(true)}>
                Reconstruction
              </button>
            </span>
          )}
          {recon?.phases && showRecon && (
            <span className="seg">
              {recon.phases.map((p) => (
                <button key={p.from} className={phase === p ? 'on' : ''} onClick={() => setPhaseYear(p.from)} title={p.label}>
                  {p.state === 'as-built' ? 'As built' : p.state === 'ruin' ? 'Ruin' : 'Restored'}
                </button>
              ))}
            </span>
          )}
          <button className={aligning ? 'on' : ''} onClick={() => (setAligning(!aligning), setOrbit(false))} title="Click the real monument in the imagery to correct the site position">
            📍 {aligning ? 'Click the monument…' : 'Align'}
          </button>
          <label>
            Relief ×{exag.toFixed(1)}
            <input type="range" min={1} max={3} step={0.1} value={exag} onChange={(e) => setExag(+e.target.value)} />
          </label>
          <span className="muted small">Drag to pan · right-drag or Ctrl-drag to tilt and rotate</span>
          <button className="close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div ref={ref} className="flyover-map" />
        {aligned && (
          <div className="flyover-note align-out">
            Corrected position for <code>{place.id}</code>: <code>"lat": {aligned[1]}, "lng": {aligned[0]}</code>. Paste into <code>src/data/places.json</code> and set{' '}
            <code>"precision": "exact"</code> once verified against a survey or plan.
          </div>
        )}
        <div className="flyover-note">
          {recon ? (
            <>
              <strong>Schematic reconstruction</strong> ({recon.confidence}){phase ? `, showing: ${phase.label}` : ''}: {recon.state}. {recon.note} Proportions of the terraces, square chamber and spire follow the conventional stupa scheme; the model is not
              survey data. Other reconstructed monuments nearby are also shown.
            </>
          ) : (
            <>Terrain comes from ~30 m elevation data, so rocks, hills and escarpments are 3D; monuments without a reconstruction appear only as imagery. Nearby reconstructed monuments are shown in 3D.</>
          )}
          {place.precision !== 'exact' && ' The site location is approximate.'}
        </div>
      </div>
    </div>
  )
}
