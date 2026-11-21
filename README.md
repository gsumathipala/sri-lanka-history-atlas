# Lanka Through Time

An evidence-based, interactive historical atlas of Sri Lanka, from the Palaeolithic (c. 125,000 BP) to the present.

- **Timeline**: a non-linear scale that gives deep prehistory and recent decades both room. It has era, polity and foreign-rule bands, drag/arrow-key navigation, an adjustable time window and a "Travel" playback mode.
- **Map**: shows places with events in the current window, plus ★ seats of power active at the cursor date. Location precision is shown visually.
- **Evidence panel**: each event has typed evidence items (archaeological, radiometric, epigraphic, chronicle, foreign account, archival, official…), each linked to a full bibliography, along with confidence ratings, perspectives on contested events, and historiographical caveats.
- **Places & sacred sites**: 192 places, including about 150 heritage sites and relic shrines (the Solosmasthana, the Atamasthana, kovils, mosques, churches and forts), each with stories tagged by what they rest on (chronicle, tradition, history or archaeology). Sites appear on the map from their founding date.
- **Rulers**: 340 kings, queens, invaders, Chola overlords, Portuguese captains-general, Dutch and British governors, governors-general, prime ministers and presidents, with succession links, the current ruler shown in the header, and a rulers strip on the timeline.
- **Chronicles**: a browser for the Dipavamsa, Mahavamsa, Culavamsa (all 101 chapters), Rajavaliya and Yalpana Vaipava Malai, cross-linked to rulers, places and events.
- **Relics**: the Tooth Relic's 14-station journey between capitals drawn as a route on the map, with its location at the current date highlighted; also the Bowl Relic, the Bodhi tree and its saplings, the enshrined body relics and Sri Pada.
- **Kingdom boundaries (schematic)**: Rajarata, Ruhuna and Maya Rata, the Jaffna kingdom, and the Kandyan kingdom versus the Portuguese/Dutch/British maritime provinces before and after 1766.
- **Basemaps**: streets, terrain or satellite.
- **3D flyover and reconstructions**: every site opens an orbiting 3D view of satellite imagery over elevation data with hillshading. Twelve monuments (the great stupas, vatadages and the Lovamahapaya pillar field) have schematic parametric 3D reconstructions, with a Today/Reconstruction toggle and an Align tool for correcting positions. Real glTF models (photogrammetry) can be added.
- **Wikipedia cards**: live images and summaries labelled as further reading, not evidence.
- **Bibliography**: every source shows which events cite it.
- **Permalinks**: `#event=<id>` / `#place=<id>`.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm run validate   # data integrity + research backlog
npm run build
```

## Status

The seed dataset has **142 events, 192 places, 340 rulers, 5 relics, 8 boundary regions, 143 chronicle chapters/sections, 97 sources and 24 periods**, all marked **unreviewed draft**. See [docs/METHODOLOGY.md](docs/METHODOLOGY.md) for the evidence standard and [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) to add or review entries.

Stack: Vite, React, TypeScript, Leaflet (OpenStreetMap tiles; use a dedicated tile provider before any public deployment, per OSM's tile usage policy).

## Configuration (optional `.env`)

```
VITE_TILE_URL=https://your-provider/{z}/{x}/{y}.png?key=...   # adds a "Custom basemap" and makes it the default
VITE_TILE_ATTRIBUTION=© Your provider
VITE_FLYOVER_IMAGERY_URL=https://.../{z}/{x}/{y}.jpg           # imagery for the 3D view (default: Esri World Imagery)
```

Before any public launch, use a commercial or self-hosted tile provider (e.g. MapTiler, Stadia or Thunderforest). The OpenStreetMap, OpenTopoMap and Esri endpoints are fine for development but have usage policies.

### 3D flyover limits

The flyover uses free elevation data (AWS Terrain Tiles, about 30 m resolution). Rocks, hills and escarpments (Sigiriya, Mihintale, Sri Pada, Dambulla, Ritigala) appear in 3D, but buildings and stupas appear only as imagery. True 3D monument models would need Google Photorealistic 3D Tiles (paid API key, via CesiumJS or deck.gl; coverage in Sri Lanka is limited) or photogrammetry from the Department of Archaeology or the Central Cultural Fund.
