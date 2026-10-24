/* One row per thing that happened to a card.
 *
 * Public and unauthenticated, because the people doing these things are
 * strangers holding someone's card - there is nobody to authenticate. That
 * makes the numbers inflatable by anyone who wants to spend an afternoon
 * curling this endpoint, which is an acceptable trade for a usage counter
 * and would not be for anything a decision rests on.
 *
 * It records that a card was saved. It records nothing about who saved it:
 * no IP, no user agent, no cookie, no fingerprint. */

import { NextResponse } from 'next/server'
import { db, isEventKind, recordEvent } from '../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!db()) return new NextResponse(null, { status: 204 })

  let body: { slug?: unknown; kind?: unknown }
  try {
    body = await req.json()
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
  if (!slug || slug.length > 64 || !/^[a-z0-9-]+$/i.test(slug)) {
    return new NextResponse(null, { status: 204 })
  }
  if (!isEventKind(body.kind)) return new NextResponse(null, { status: 204 })

  await recordEvent(slug, body.kind)
  /* 204 whatever happens: a counter has nothing to tell the page. */
  return new NextResponse(null, { status: 204 })
}
