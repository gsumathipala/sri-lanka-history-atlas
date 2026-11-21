import * as THREE from 'three'
import type { Reconstruction } from '../types'

/**
 * Builds a schematic THREE.Group (Y up, metres, origin at ground centre) from a
 * parametric description. The proportions of the superstructure (terraces, square
 * chamber, spire) follow the conventional Sri Lankan stupa scheme; they are
 * schematic, not survey data.
 */

const PLASTER = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.85 })
const STONE = new THREE.MeshStandardMaterial({ color: 0xbdb3a3, roughness: 0.95 })
const BRICK = new THREE.MeshStandardMaterial({ color: 0xa86a45, roughness: 0.95 })
const GILT = new THREE.MeshStandardMaterial({ color: 0xd4a83a, roughness: 0.4, metalness: 0.6 })

/** Exponent of the superellipse used for each dome profile. */
const SHAPE_EXP: Record<NonNullable<Reconstruction['shape']>, number> = {
  bubble: 2.0, // hemispherical
  bell: 2.8, // full shoulders, steeper sides
  pot: 3.4, // near-vertical sides
  'paddy-heap': 1.6, // lower, conical
}

function stupa(diameter: number, height: number, shape: Reconstruction['shape'] = 'bubble'): THREE.Group {
  const g = new THREE.Group()
  const R = diameter / 2
  const H = height
  // three basal terraces (pesa valalu)
  const tH = Math.max(0.3, 0.02 * H)
  let y = 0
  ;[1.12, 1.07, 1.03].forEach((k) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(R * k, R * k, tH, 96), PLASTER)
    m.position.y = y + tH / 2
    g.add(m)
    y += tH
  })
  // dome (garbha): superellipse lathe
  const p = SHAPE_EXP[shape]
  const domeH = Math.min(R * (shape === 'paddy-heap' ? 0.8 : 1.0), 0.55 * H)
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 48; i++) {
    const t = i / 48
    const yy = t * domeH
    const r = R * Math.pow(Math.max(0, 1 - Math.pow(t, p)), 1 / p)
    pts.push(new THREE.Vector2(Math.max(r, 0.001), yy))
  }
  const dome = new THREE.Mesh(new THREE.LatheGeometry(pts, 96), PLASTER)
  dome.position.y = y
  g.add(dome)
  y += domeH * 0.97
  // square chamber (hatharaskotuwa)
  const sq = Math.max(1, 0.2 * diameter)
  const sqH = Math.max(0.8, 0.08 * H)
  const chamber = new THREE.Mesh(new THREE.BoxGeometry(sq, sqH, sq), PLASTER)
  chamber.position.y = y + sqH / 2
  g.add(chamber)
  y += sqH
  // cylinder of the gods (devata kotuwa)
  const cylR = sq * 0.38
  const cylH = Math.max(0.5, 0.04 * H)
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(cylR, cylR, cylH, 48), PLASTER)
  cyl.position.y = y + cylH / 2
  g.add(cyl)
  y += cylH
  // spire (kotha) and finial (chudamanikya)
  const spireH = Math.max(1, H - y)
  const spire = new THREE.Mesh(new THREE.ConeGeometry(cylR * 0.9, spireH, 48), GILT)
  spire.position.y = y + spireH / 2
  g.add(spire)
  const fin = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.3, cylR * 0.25), 16, 12), GILT)
  fin.position.y = y + spireH
  g.add(fin)
  return g
}

function pillarsInstanced(positions: [number, number][], height: number, radius: number, mat: THREE.Material): THREE.InstancedMesh {
  const geo = new THREE.BoxGeometry(radius * 2, height, radius * 2)
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length)
  const m = new THREE.Matrix4()
  positions.forEach(([x, z], i) => {
    m.makeTranslation(x, height / 2, z)
    mesh.setMatrixAt(i, m)
  })
  return mesh
}

export function buildReconstruction(r: Reconstruction): THREE.Group {
  const g = new THREE.Group()
  if (r.type === 'stupa' && r.diameter && r.height) {
    let base = 0
    if (r.platform) {
      const plat = new THREE.Mesh(new THREE.BoxGeometry(r.platform.side, r.platform.height, r.platform.side), r.platform.elephantWall ? STONE : BRICK)
      plat.position.y = r.platform.height / 2
      g.add(plat)
      base = r.platform.height
      if (r.platform.elephantWall) {
        // a band representing the wall of elephants around the terrace
        const s = r.platform.side
        const band = new THREE.Mesh(new THREE.BoxGeometry(s + 1, 2.5, s + 1), STONE)
        band.position.y = base - 1.25
        g.add(band)
      }
    }
    const st = stupa(r.diameter, r.height, r.shape)
    st.position.y = base
    g.add(st)
  } else if (r.type === 'vatadage' && r.vatadage && r.diameter && r.height) {
    const v = r.vatadage
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(v.platformRadius, v.platformRadius * 1.04, v.platformHeight, 96), STONE)
    plat.position.y = v.platformHeight / 2
    g.add(plat)
    const pos: [number, number][] = []
    for (const ring of v.rings) for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2
      pos.push([Math.cos(a) * ring.radius, Math.sin(a) * ring.radius])
    }
    const pil = pillarsInstanced(pos, v.pillarHeight, 0.25, STONE)
    pil.position.y = v.platformHeight
    g.add(pil)
    const st = stupa(r.diameter, r.height, r.shape)
    st.position.y = v.platformHeight
    g.add(st)
  } else if (r.type === 'pillar-hall' && r.grid) {
    const { cols, rows, spacing, pillarHeight } = r.grid
    const pos: [number, number][] = []
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) pos.push([(i - (cols - 1) / 2) * spacing, (j - (rows - 1) / 2) * spacing])
    g.add(pillarsInstanced(pos, pillarHeight, 0.22, STONE))
  }
  return g
}
