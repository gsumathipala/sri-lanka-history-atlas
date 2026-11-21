/* Lanka Through Time service worker: offline app shell, data and texts; bounded tile cache. */
const VERSION = 'lt-v1'
const SHELL = `${VERSION}-shell`
const TILES = `${VERSION}-tiles`
const MAX_TILES = 1500
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './texts/index.json'])).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
async function trim(cache, max) {
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const isTile = /tile\.openstreetmap\.org|tile\.opentopomap\.org|arcgisonline\.com|elevation-tiles-prod/.test(url.host + url.pathname)
  if (isTile) {
    // tiles: cache-first, bounded (only tiles the user has actually viewed; no bulk prefetch, per OSM tile policy)
    e.respondWith(
      caches.open(TILES).then(async (c) => {
        const hit = await c.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok || res.type === 'opaque') {
          c.put(req, res.clone())
          trim(c, MAX_TILES)
        }
        return res
      }),
    )
    return
  }
  if (url.origin === location.origin) {
    // app shell, data, texts, maps: stale-while-revalidate
    e.respondWith(
      caches.open(SHELL).then(async (c) => {
        const hit = await c.match(req)
        const net = fetch(req)
          .then((res) => {
            if (res.ok) c.put(req, res.clone())
            return res
          })
          .catch(() => hit || (req.mode === 'navigate' ? c.match('./index.html') : undefined))
        return hit || net
      }),
    )
  }
})
