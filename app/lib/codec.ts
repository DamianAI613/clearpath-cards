/* The database-free storage path.
 *
 * The entire card is LZ-compressed into the URL *fragment*. The fragment is
 * the one part of a URL a browser never transmits, so a card encoded this way
 * is not merely server-less - the server could not read it if it wanted to.
 * There is no row to lose, no env var to misconfigure and no request to fail.
 *
 * The tradeoff is link length and no Open Graph preview, which is exactly what
 * the shortlink path buys back when a database is available.
 */

import LZString from 'lz-string'
import { type Card, isCard } from './card'

export function encodeCard(card: Card): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(card))
}

export function decodeCard(fragment: string): Card | null {
  if (!fragment) return null
  try {
    const raw = LZString.decompressFromEncodedURIComponent(fragment.replace(/^#/, ''))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isCard(parsed) ? parsed : null
  } catch {
    /* A truncated or hand-mangled link is a bad link, not a crash. */
    return null
  }
}

/** The permanent, zero-backend link for a card. */
export function cardUrl(card: Card, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://card.clearpathautomation.io')
  return `${base}/c#${encodeCard(card)}`
}
