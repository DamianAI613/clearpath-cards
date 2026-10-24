/* A service worker that exists for two reasons.
 *
 * One: a card that opens with no signal. Someone asks for your details in a
 * lift, a basement, a conference hall with 4,000 people on one cell - the
 * card should still be there. Network-first means you never see a stale card
 * while you have a connection; the cache only answers when the network does
 * not.
 *
 * Two: Chrome has historically refused to fire its install prompt for a site
 * without a service worker that handles fetch. The documentation no longer
 * agrees with itself on whether that is still true, and the cost of settling
 * the question is this file.
 *
 * What is deliberately NOT cached: anything under /api/. A cached answer to
 * "is this link available" or "does this PIN match" would be worse than no
 * answer at all. */

const CACHE = 'clearpath-cards-v2'

/* Network-first has one failure worse than being offline: the connection
 * that is technically alive and effectively dead. A conference hall, a lift,
 * one bar of signal - the request does not fail, it hangs, and the browser
 * will wait tens of seconds before giving up. Meanwhile a perfectly good
 * copy of the card is sitting in the cache.
 *
 * So the network gets a head start and then loses. If it has not answered in
 * this many milliseconds AND a cached copy exists, the cached one is served
 * immediately while the request keeps running to refresh the cache. No copy
 * cached yet means there is nothing better to offer, so that case waits. */
const SLOW_MS = 2500

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    /* Drop caches from older versions of this worker. */
    const names = await caches.keys()
    await Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  /* Only keep what is worth having offline: the page itself and the build's
   * immutable assets. A 404 or a 500 is never cached. */
  const keep = req.mode === 'navigate' || url.pathname.startsWith('/_next/static')

  event.respondWith((async () => {
    const cached = await caches.match(req)

    const network = fetch(req).then(async fresh => {
      if (keep && fresh && fresh.ok) {
        const cache = await caches.open(CACHE)
        await cache.put(req, fresh.clone())
      }
      return fresh
    })
    /* The race below can leave this promise rejecting with nobody
     * listening, which logs an unhandled rejection in every console. */
    network.catch(() => {})

    if (cached) {
      try {
        return await Promise.race([
          network,
          new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), SLOW_MS)),
        ])
      } catch {
        /* Slow or broken, same answer: the copy we already have. The
         * request carries on in the background and refreshes the cache for
         * next time. */
        return cached
      }
    }

    try {
      return await network
    } catch {
      /* Offline and never seen: say so in the card's own voice rather than
       * handing over the browser's dinosaur. */
      if (req.mode === 'navigate') {
        return new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<title>Offline</title><body style="margin:0;display:flex;align-items:center;justify-content:center;' +
          'min-height:100vh;background:#09090B;color:#BAC6D6;font:16px/1.6 system-ui,sans-serif;text-align:center">' +
          '<p style="max-width:300px;padding:24px">No connection, and this card has not been opened on this phone ' +
          'before — so there is nothing saved to show. It will load as soon as you have signal.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 },
        )
      }
      throw new Error('offline')
    }
  })())
})
