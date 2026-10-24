/* Telling the server that something happened, without caring if it hears.
 *
 * sendBeacon exists for exactly this: it survives the page being navigated
 * away from, which is the normal case here - tapping Save to contacts or
 * Share is often the last thing that happens on the page. Nothing waits on
 * the result and nothing is shown if it fails. */

import type { EventKind } from './db'

export function ping(slug: string | undefined, kind: EventKind): void {
  if (!slug) return
  try {
    const body = JSON.stringify({ slug, kind })
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }))
      return
    }
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch { /* a counter is never worth an exception */ }
}
