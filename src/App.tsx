import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import type { Category, Confidence } from './types'
import { CATEGORY_META, CONFIDENCE_META, POLITY_META, ROLE_LABEL, eventById, events, periods, placeById, regions, relicById, rulerById, rulers, rulersAt, sites } from './lib/data'
import { formatYear, posToYear, yearToPos } from './lib/time'
import { LANGS, setLang, getLang, useT, type Lang } from './lib/i18n'
import { catLabel, confLabel } from './lib/data'
import historicalMaps from './data/historical-maps.json'
import Timeline from './components/Timeline'
import MapView from './components/MapView'
import { About, Bibliography, EventDetail, EventList, EventRow, PlaceDetail } from './components/Panels'
import { ChroniclesPanel, RulerDetail, RulerRow, RulersPanel } from './components/Knowledge'
import { RelicDetail, RelicsPanel, currentStation } from './components/Relics'
import { TourPlayer, ToursPanel, tourById } from './components/Tours'
const Flyover = lazy(() => import('./components/Flyover'))

type Panel = 'list' | 'event' | 'place' | 'sources' | 'about' | 'rulers' | 'ruler' | 'chronicles' | 'relics' | 'relic' | 'tours' | 'tour'

const ALL_CATS = Object.keys(CATEGORY_META) as Category[]
const ALL_CONF = Object.keys(CONFIDENCE_META) as Confidence[]

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1))
  return { event: h.get('event') ?? undefined, place: h.get('place') ?? undefined, ruler: h.get('ruler') ?? undefined }
}

export default function App() {
  const t = useT()
  const initial = readHash()
  const initialEvent = initial.event ? eventById.get(initial.event) : undefined
  const initialRuler = initial.ruler ? rulerById.get(initial.ruler) : undefined
  const initialPlace = initial.place ? placeById.get(initial.place) : undefined
  const [pos, setPosRaw] = useState(
    yearToPos(initialEvent?.start ?? (initialRuler ? (initialRuler.start + initialRuler.end) / 2 : undefined) ?? (initialPlace?.founded !== undefined ? Math.max(initialPlace.founded, -250) : -250)),
  )
  const [windowHalf, setWindowHalf] = useState(0.02)
  const [showAll, setShowAll] = useState(false)
  const [cats, setCats] = useState<Set<Category>>(new Set(ALL_CATS))
  const [confs, setConfs] = useState<Set<Confidence>>(new Set(ALL_CONF))
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | undefined>(initialEvent?.id)
  const [placeId, setPlaceId] = useState<string | undefined>(initial.place)
  const [panel, setPanel] = useState<Panel>(initialEvent ? 'event' : initial.place ? 'place' : initial.ruler ? 'ruler' : 'list')
  const [rulerId, setRulerId] = useState<string | undefined>(initial.ruler)
  const [chapterFocus, setChapterFocus] = useState<string>()
  const [showSites, setShowSites] = useState(true)
  const [showRegions, setShowRegions] = useState(true)
  const [showUndated, setShowUndated] = useState(false)
  const [overlayId, setOverlayId] = useState('')
  const [overlayOpacity, setOverlayOpacity] = useState(0.7)
  const overlay = historicalMaps.find((m) => m.id === overlayId) as (typeof historicalMaps)[number] & { bounds: [[number, number], [number, number]] } | undefined
  const [relicId, setRelicId] = useState<string>()
  const [flyoverId, setFlyoverId] = useState<string>()
  const [tourId, setTourId] = useState<string>()
  const [tourStep, setTourStep] = useState(0)
  const [tourPlaying, setTourPlaying] = useState(false)
  const tour = tourId ? tourById.get(tourId) : undefined
  useEffect(() => {
    const st = tour?.steps[tourStep]
    if (!st || panel !== 'tour') return
    setPosRaw(yearToPos(st.year))
    if (st.placeId) setPlaceId(st.placeId)
    setRelicId(st.relicId ?? tour?.relic)
  }, [tour, tourStep, panel])
  const [legendOpen, setLegendOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 900)
  const [sourceFocus, setSourceFocus] = useState<string>()
  const [playing, setPlaying] = useState(false)

  const setPos = (p: number) => setPosRaw(Math.min(1, Math.max(0, p)))
  const year = posToYear(pos)
  const lo = posToYear(pos - windowHalf)
  const hi = posToYear(pos + windowHalf)

  const filtered = useMemo(() => events.filter((e) => cats.has(e.category) && confs.has(e.confidence)), [cats, confs])

  const inWindow = useMemo(
    () => (showAll ? filtered : filtered.filter((e) => (e.end ?? e.start) >= lo && e.start <= hi)),
    [filtered, showAll, lo, hi],
  )

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return filtered.filter((e) => [e.title, e.summary, ...(e.tags ?? []), e.historiography ?? ''].join(' ').toLowerCase().includes(q))
  }, [query, filtered])

  const q2 = query.trim().toLowerCase()
  const rulerResults = q2.length >= 2 ? rulers.filter((r) => r.name.toLowerCase().includes(q2)).slice(0, 15) : []
  const placeResults = q2.length >= 2 ? [...placeById.values()].filter((p) => [p.name, ...(p.altNames ?? []), ...(p.stories ?? []).map((x) => x.title + ' ' + x.text)].join(' ').toLowerCase().includes(q2)).slice(0, 15) : []
  const capitals = periods.filter((p) => p.capitalPlaceId && p.track !== 'era' && p.start <= year && p.end >= year)
  const currentEras = periods.filter((p) => p.start <= year && p.end >= year)
  const selected = selectedId ? eventById.get(selectedId) : undefined
  const currentRulers = rulersAt(year)
  const visibleSites = showSites ? sites.filter((p) => (p.founded !== undefined ? p.founded <= year : !p.importedFrom || showUndated || showAll)) : []
  const ruler = rulerId ? rulerById.get(rulerId) : undefined
  const relic = relicId && (panel === 'relic' || panel === 'relics' || panel === 'place' || panel === 'tour') ? relicById.get(relicId) : undefined
  const relicCurrent = relic ? currentStation(relic, year) : -1
  const visibleRegions = showRegions ? regions.filter((g) => g.start <= year && g.end >= year) : []
  const flyoverPlace = flyoverId ? placeById.get(flyoverId) : undefined

  // playback: travel forward through time
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      setPosRaw((p) => {
        if (p >= 1) {
          setPlaying(false)
          return 1
        }
        return Math.min(1, p + 0.0015)
      })
    }, 60)
    return () => clearInterval(t)
  }, [playing])

  // permalinks
  useEffect(() => {
    const h = panel === 'event' && selectedId ? `event=${selectedId}` : placeId && panel === 'place' ? `place=${placeId}` : panel === 'ruler' && rulerId ? `ruler=${rulerId}` : ''
    history.replaceState(null, '', h ? `#${h}` : location.pathname)
  }, [selectedId, placeId, panel, rulerId])

  useEffect(() => {
    const onHash = () => {
      const h = readHash()
      if (h.event && eventById.has(h.event)) selectEvent(h.event)
      else if (h.ruler && rulerById.has(h.ruler)) selectRuler(h.ruler)
      else if (h.place && placeById.has(h.place)) selectPlace(h.place)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  })

  function selectEvent(id: string) {
    const e = eventById.get(id)
    if (!e) return
    setSelectedId(id)
    setPlaceId(undefined)
    setPanel('event')
    setPlaying(false)
    const p = yearToPos(e.start)
    if (!showAll && (p < pos - windowHalf || p > pos + windowHalf)) setPos(p)
  }
  function selectPlace(id: string) {
    const pl = placeById.get(id)
    if (pl?.founded !== undefined && pl.founded > year) setPos(yearToPos(pl.founded))
    setPlaceId(id)
    setSelectedId(undefined)
    setPanel('place')
  }
  function selectRuler(id: string) {
    const r = rulerById.get(id)
    if (!r) return
    setRulerId(id)
    setSelectedId(undefined)
    setPanel('ruler')
    setPlaying(false)
    const p = yearToPos(r.start)
    if (p < pos - windowHalf || p > pos + windowHalf) setPos(yearToPos((r.start + r.end) / 2))
  }
  function openChapter(k: string) {
    setChapterFocus(k)
    setPanel('chronicles')
  }
  function openSource(id: string) {
    setSourceFocus(id)
    setPanel('sources')
    setTimeout(() => document.getElementById(`src-${id}`)?.scrollIntoView({ block: 'center' }), 50)
  }
  const toggle = <T,>(set: Set<T>, v: T, fn: (s: Set<T>) => void) => {
    const n = new Set(set)
    if (n.has(v)) n.delete(v)
    else n.add(v)
    fn(n)
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <h1>{t('title')}</h1>
          <span className="sub">{t('subtitle')}</span>
        </div>
        <div className="now">
          <div className="now-year">{formatYear(year)}</div>
          <div className="now-era">{currentEras.map((p) => p.name).join(' · ')}</div>
          <div className="now-rulers">
            {currentRulers.slice(0, 4).map((r) => (
              <button key={r.id} onClick={() => selectRuler(r.id)} style={{ borderColor: POLITY_META[r.polity]?.color }} title={`${ROLE_LABEL[r.role]}, ${POLITY_META[r.polity]?.label}`}>
                {r.name}
              </button>
            ))}
          </div>
        </div>
        <input className="search" type="search" placeholder={t('search')} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
        <nav>
          {(['list', 'tours', 'rulers', 'relics', 'chronicles', 'sources', 'about'] as Panel[]).map((p) => (
            <button key={p} className={panel === p || (p === 'rulers' && panel === 'ruler') || (p === 'relics' && panel === 'relic') || (p === 'tours' && panel === 'tour') ? 'on' : ''} onClick={() => setPanel(p)}>
              {t(`tab_${p}` as 'tab_list')}
            </button>
          ))}
        </nav>
        <select className="lang" value={getLang()} onChange={(e) => setLang(e.target.value as Lang)} aria-label="Language">
          {LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </header>

      <div className="banner" role="note">
        {t('banner')}
      </div>

      <main>
        <section className="map-wrap">
          <MapView events={inWindow} selected={panel === 'event' ? selected : undefined} selectedPlaceId={placeId} capitals={capitals} sites={visibleSites} regions={visibleRegions} relic={relic} relicCurrent={relicCurrent} overlay={overlay} overlayOpacity={overlayOpacity} onPlace={selectPlace} />
          <div className={`legend${legendOpen ? '' : ' collapsed'}`}>
            <button className="legend-toggle" onClick={() => setLegendOpen(!legendOpen)}>
              {legendOpen ? t('filters_hide') : t('filters_show')}
            </button>
            <label className={showSites ? 'span2' : 'span2 off'}>
              <input type="checkbox" checked={showSites} onChange={(e) => setShowSites(e.target.checked)} />
              <span>▲ ☸ ◆ ☾ ✝ ▣</span> {t('sites')} ({visibleSites.length})
            </label>
            <label className={showUndated ? 'span2' : 'span2 off'} title="Sites imported from Wikidata without a founding date are hidden unless this is on (or 'All time' is ticked)">
              <input type="checkbox" checked={showUndated} onChange={(e) => setShowUndated(e.target.checked)} />
              <span>◌</span> {t('undated')} ({sites.filter((x) => x.importedFrom && x.founded === undefined).length})
            </label>
            <label className="span2 overlay-pick">
              🗺{' '}
              <select value={overlayId} onChange={(e) => setOverlayId(e.target.value)} aria-label="Historical map overlay">
                <option value="">No historical map</option>
                {historicalMaps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title.slice(0, 48)}
                  </option>
                ))}
              </select>
              {overlay && <input type="range" min={0.1} max={1} step={0.05} value={overlayOpacity} onChange={(e) => setOverlayOpacity(+e.target.value)} aria-label="Overlay opacity" />}
            </label>
            {overlay && (
              <div className="span2 muted small overlay-note">
                Georeferenced ±{overlay.rmsKm} km. {overlay.method}{' '}
                <a href={overlay.source} target="_blank" rel="noreferrer">
                  Source ({overlay.licence})
                </a>
              </div>
            )}
            <label className={showRegions ? 'span2' : 'span2 off'}>
              <input type="checkbox" checked={showRegions} onChange={(e) => setShowRegions(e.target.checked)} />
              <span>▱</span> {t('boundaries')} ({visibleRegions.length})
            </label>
            <hr />
            {ALL_CATS.map((c) => (
              <label key={c} className={cats.has(c) ? '' : 'off'}>
                <input type="checkbox" checked={cats.has(c)} onChange={() => toggle(cats, c, setCats)} />
                <span className="dot" style={{ background: CATEGORY_META[c].color }} />
                {catLabel(c)}
              </label>
            ))}
            <hr />
            {ALL_CONF.map((c) => (
              <label key={c} className={confs.has(c) ? '' : 'off'}>
                <input type="checkbox" checked={confs.has(c)} onChange={() => toggle(confs, c, setConfs)} />
                <span className={`badge conf-${c}`}>{confLabel(c)}</span>
              </label>
            ))}
          </div>
        </section>

        <aside className="panel">
          {query.trim().length >= 2 ? (
            <div>
              <h2>Search: “{query}”</h2>
              {rulerResults.length > 0 && <h3>Rulers ({rulerResults.length})</h3>}
              {rulerResults.map((r) => (
                <RulerRow key={r.id} r={r} onRuler={(id) => (setQuery(''), selectRuler(id))} />
              ))}
              {placeResults.length > 0 && <h3>Places & stories ({placeResults.length})</h3>}
              {placeResults.map((p) => (
                <button key={p.id} className="event-row" onClick={() => (setQuery(''), selectPlace(p.id))}>
                  <span className="event-row-body">
                    <span className="event-row-title">📍 {p.name}</span>
                    {p.foundedLabel && <span className="event-row-meta">{p.foundedLabel}</span>}
                  </span>
                </button>
              ))}
              <h3>Events ({searchResults.length})</h3>
              {searchResults.map((e) => (
                <EventRow
                  key={e.id}
                  e={e}
                  onSelect={(id) => {
                    setQuery('')
                    selectEvent(id)
                    setPos(yearToPos(eventById.get(id)!.start))
                  }}
                />
              ))}
            </div>
          ) : panel === 'event' && selected ? (
            <EventDetail e={selected} onPlace={selectPlace} onSource={openSource} onSelect={selectEvent} onChapter={openChapter} />
          ) : panel === 'place' && placeId ? (
            <PlaceDetail id={placeId} onSelect={selectEvent} onChapter={openChapter} onRuler={selectRuler} onSource={openSource} onFlyover={setFlyoverId} />
          ) : panel === 'ruler' && ruler ? (
            <RulerDetail r={ruler} onChapter={openChapter} onPlace={selectPlace} onRuler={selectRuler} onYear={(y) => setPos(yearToPos(y))} />
          ) : panel === 'tour' && tour ? (
            <TourPlayer
              tour={tour}
              step={tourStep}
              playing={tourPlaying}
              onStep={setTourStep}
              onPlay={setTourPlaying}
              onExit={() => (setTourPlaying(false), setPanel('tours'))}
              onChapter={openChapter}
              onEvent={selectEvent}
              onPlace={selectPlace}
            />
          ) : panel === 'tours' ? (
            <ToursPanel onStart={(id) => (setTourId(id), setTourStep(0), setTourPlaying(false), setPanel('tour'))} />
          ) : panel === 'relic' && relic ? (
            <RelicDetail r={relic} year={year} onPlace={selectPlace} onChapter={openChapter} onYear={(y) => setPos(yearToPos(y))} onSource={openSource} />
          ) : panel === 'relics' ? (
            <RelicsPanel onRelic={(id) => (setRelicId(id), setPanel('relic'))} />
          ) : panel === 'rulers' ? (
            <RulersPanel year={year} onRuler={selectRuler} />
          ) : panel === 'chronicles' ? (
            <ChroniclesPanel focus={chapterFocus} onSelect={selectEvent} onPlace={selectPlace} onRuler={selectRuler} onYear={(y) => setPos(yearToPos(y))} />
          ) : panel === 'sources' ? (
            <Bibliography focus={sourceFocus} onSelect={selectEvent} />
          ) : panel === 'about' ? (
            <About />
          ) : (
            <EventList events={inWindow} onSelect={selectEvent} heading={showAll ? `All events (${inWindow.length})` : `${formatYear(lo)} – ${formatYear(hi)} (${inWindow.length})`} />
          )}
        </aside>
      </main>

      {flyoverPlace && (
        <Suspense fallback={<div className="flyover-backdrop">Loading 3D view…</div>}>
          <Flyover place={flyoverPlace} onClose={() => setFlyoverId(undefined)} />
        </Suspense>
      )}

      <footer>
        <div className="controls">
          <button onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play through time'}>
            {playing ? t('pause') : t('travel')}
          </button>
          <button onClick={() => setPos(pos - 0.01)} aria-label="Step back">
            ◀
          </button>
          <button onClick={() => setPos(pos + 0.01)} aria-label="Step forward">
            ▶
          </button>
          <label>
            {t('window')}
            <input type="range" min={0.005} max={0.12} step={0.005} value={windowHalf} onChange={(e) => setWindowHalf(+e.target.value)} disabled={showAll} />
          </label>
          <label>
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> {t('alltime')}
          </label>
          <span className="muted small">{t('hint')}</span>
        </div>
        <Timeline pos={pos} windowHalf={windowHalf} showAll={showAll} events={filtered} selectedId={selectedId} onPos={setPos} onSelect={selectEvent} onRuler={selectRuler} />
      </footer>
    </div>
  )
}
