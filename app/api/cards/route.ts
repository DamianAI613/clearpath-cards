/* Publish a card to the database. The caller falls back to a fragment link
 * if this route is unavailable or errors, so failure here is survivable and
 * must be reported honestly rather than retried into a 500 loop. */

import { NextResponse } from 'next/server'
import { isCard, slugShape } from '../../lib/card'
import { createCard, db, isPin, slugTaken } from '../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* Is this link free? Asked while someone types one, so it answers about a
 * public URL and nothing else - the same thing anyone learns by opening it. */
export async function GET(req: Request) {
  const slug = (new URL(req.url).searchParams.get('slug') ?? '').trim().toLowerCase()
  const shape = slugShape(slug)
  if (shape !== 'ok') return NextResponse.json({ slug, available: false, reason: shape })
  if (!db()) return NextResponse.json({ slug, available: false, reason: 'storage_unconfigured' })
  try {
    return NextResponse.json({ slug, available: !(await slugTaken(slug)) })
  } catch {
    return NextResponse.json({ slug, available: false, reason: 'storage_failed' })
  }
}

export async function POST(req: Request) {
  if (!db()) {
    return NextResponse.json({ error: 'storage_unconfigured' }, { status: 503 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }

  /* Two accepted shapes. The original was the bare card; the PIN arrived
   * later and travels beside it rather than inside it, because it is a
   * credential and must never end up in the card's own JSON. */
  const wrapped = body && typeof body === 'object' && 'card' in body
    ? (body as { card: unknown; pin?: unknown; slug?: unknown })
    : { card: body, pin: undefined, slug: undefined }

  if (!isCard(wrapped.card)) {
    return NextResponse.json({ error: 'not_a_card' }, { status: 400 })
  }
  if (wrapped.pin !== undefined && !isPin(wrapped.pin)) {
    return NextResponse.json({ error: 'bad_pin' }, { status: 400 })
  }
  /* A card is small. Anything large is either a mistake or an attempt to use
   * the table as free storage. */
  if (JSON.stringify(wrapped.card).length > 400_000) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 })
  }

  const wantedSlug = typeof wrapped.slug === 'string' && wrapped.slug.trim()
    ? wrapped.slug.trim().toLowerCase()
    : undefined

  try {
    const made = await createCard(wrapped.card, {
      pin: isPin(wrapped.pin) ? wrapped.pin : undefined,
      slug: wantedSlug,
    })
    if (!made) return NextResponse.json({ error: 'storage_unconfigured' }, { status: 503 })
    if (!made.ok) {
      /* 409 for a link someone else already has, 400 for one that was never
       * allowed. The difference decides whether retrying is worth it. */
      const status = made.reason === 'taken' ? 409 : made.reason === 'no_slug_available' ? 500 : 400
      return NextResponse.json({ error: made.reason }, { status })
    }
    return NextResponse.json({ slug: made.slug, token: made.token }, { status: 201 })
  } catch (e) {
    console.error('[cards] create failed', e)
    return NextResponse.json({ error: 'storage_failed' }, { status: 503 })
  }
}
