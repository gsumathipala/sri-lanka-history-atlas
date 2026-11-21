# Contributing data

All content lives in `src/data/` as plain JSON, so historians can contribute without touching code.

```
src/data/
  sources.json        bibliography (every citation must point here)
  places.json         gazetteer with coordinates and precision
  periods.json        eras, polities/capitals and foreign rule (timeline bands)
  events/
    01-prehistory.json
    02-anuradhapura.json
    03-medieval.json
    04-colonial.json
    05-modern.json
```

## Adding an event

```json
{
  "id": "kebab-case-unique-id",
  "title": "Short descriptive title",
  "start": -161,
  "end": -137,
  "dateLabel": "Traditional c. 161 BCE",
  "dateNote": "How the date is derived / why uncertain",
  "category": "conflict",
  "confidence": "traditional",
  "placeIds": ["anuradhapura"],
  "summary": "2-4 neutral sentences.",
  "evidence": [
    { "type": "chronicle", "description": "What this source attests.", "sourceId": "geiger1912", "locator": "Mahavamsa ch. 25, vv. 1-75" }
  ],
  "historiography": "Debates, biases of the sources, alternative readings.",
  "perspectives": [{ "label": "Position A", "view": "...", "sourceId": "..." }],
  "tags": ["kingship"],
  "review": { "status": "draft" }
}
```

Field reference: `src/types.ts`. Allowed values for `category`, `confidence` and evidence `type` are listed there and in `docs/METHODOLOGY.md`.

## Rules

1. **No claim without a source.** Add the work to `sources.json` first.
2. **Use a precise locator**: chapter and verse for chronicles, inscription number and volume for epigraphy, page for books, trench and context for excavation reports.
3. **Prefer primary evidence.** Cite the inscription or text, and add the modern synthesis as a second item.
4. **Don't overstate confidence.** When in doubt, go one level lower.
5. **Marking an entry reviewed** means you checked every evidence item against the source yourself. Set `"review": { "status": "reviewed", "reviewer": "Name", "date": "YYYY-MM-DD" }`.

## Checks

```
npm run validate     # integrity errors + scholarly-quality warnings
npm run build        # runs validate first; fails on any error
```

The validator rejects unknown sources and places, bad dates, year 0, coordinates outside Sri Lanka, and contested entries without historiography. It warns about entries supported only by secondary synthesis or by a single item while rated "established".

## Rulers (`src/data/rulers.json`)

```json
{ "id": "parakramabahu-i", "name": "Parakramabahu I", "start": 1153, "end": 1186, "role": "king",
  "polity": "polonnaruwa", "capitalPlaceId": "polonnaruwa",
  "chronicle": [{ "work": "culavamsa", "chapter": 62 }],
  "geiger": "only if Geiger's chronology differs", "wiki": "Exact Wikipedia title (optional)" }
```

Roles: king, queen, regent, sub-king, invader, foreign-sovereign, captain-general, governor, governor-general, prime-minister, president. Polity keys are listed in `POLITY_META` (`src/lib/data.ts`). Store dates in the **conventional chronology** and give Geiger's dates in `geiger`.

## Sacred and historic sites (in `places.json`)

Any place becomes a site, shown on the map's site layer, once it has a `siteType`. Optional fields: `religion`, `founded` (the year the site appears on the map), `foundedLabel`, `groups` (`solosmasthana`, `atamasthana`, `unesco`), `chronicle`, `wiki`, and `stories`:

```json
{ "title": "The first stupa", "text": "...", "basis": "chronicle",
  "chronicle": [{ "work": "mahavamsa", "chapter": 17 }], "sourceId": "optional" }
```

`basis` must say honestly what a story rests on: `chronicle` (and then it needs a chronicle ref), `tradition` (local or religious tradition not in the chronicles), `history` (documentary evidence) or `archaeology`.

## Chronicle chapters (`src/data/chronicles.json`)

This is a chapter index for the Dipavamsa (1-22), Mahavamsa (1-37) and Culavamsa (37-101). The Mahavamsa titles follow Geiger. Dipavamsa and Culavamsa entries are marked `approximate` until someone checks them against the Oldenberg and Geiger editions; the Culavamsa index is still incomplete. The validator rejects chapter numbers outside each work's range.

## Wikipedia

`wiki` fields hold exact English Wikipedia titles. Without one, the app uses the top Wikipedia search result and labels the card "auto-matched". Wikipedia appears under *Media & further reading* only and is **never** an evidence source.

## Relics (`src/data/relics.json`)

Each relic has a `kind` (`saririka` bodily, `paribhogika` object of use, `uddesika` commemorative) and `stations`. When `journey` is true the stations are drawn in order as a route, and the station current at the timeline date is highlighted. Each station needs a `basis`, and a chronicle ref if that basis is `chronicle`.

## Boundary regions (`src/data/regions.json`)

These are **schematic** polygons (`[lat, lng]` rings; extra rings are holes) shown between `start` and `end`. They are drawn from river boundaries and treaty descriptions, not surveyed lines, so cite the source of the boundary description. Accurate georeferenced boundaries are welcome.

## Verse-level references

Chronicle refs accept `"verses": "1-28"`. Add verses **only** after checking them in the cited edition (Geiger for the Mahavamsa and Culavamsa, Oldenberg for the Dipavamsa). The seed data cites chapters only, on purpose: verse numbers from memory would be false precision.

## 3D reconstructions (`src/data/reconstructions.json`)

These are parametric, schematic models shown in the 3D flyover:

- `stupa`: `shape` (bubble, bell, pot or paddy-heap), `diameter`, `height`, and an optional square `platform` (with `elephantWall`)
- `vatadage`: a stupa plus a circular platform and pillar `rings`
- `pillar-hall`: a `grid` of pillars

Every model must give its `state` (as built, as restored, or ruin), a `confidence` (approximate, uncertain or illustrative) and its sources. Use published measured dimensions where they exist (Archaeological Survey reports, Central Cultural Fund publications); the seed values are rounded commonly cited figures.

**Real models.** Add `"model": { "url": "/models/x.glb", "scale": 1, "rotationDeg": 0, "credit": "...", "licence": "CC BY 4.0" }` to show a glTF/GLB model, for example photogrammetry from drone photos, in place of the parametric one. The model's origin must be at ground level in the monument's centre, with units in metres and Y pointing up. Put files in `public/models/`.

**Positioning.** Models stand at the place's coordinates. In the flyover, use **📍 Align** and click the real monument in the imagery; the panel then shows corrected coordinates to paste into `places.json`. Keep `precision` as `approximate` unless the position comes from a survey.
