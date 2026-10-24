/* Publish a card to the database. The caller falls back to a fragment link
 * if this route is unavailable or errors, so failure here is survivable and
 * must be reported honestly rather than retried into a 500 loop. */

import { NextResponse } from 'next/server'
import { isCard } from '../../lib/card'
import { createCard, db, isPin } from '../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    ? (body as { card: unknown; pin?: unknown })
    : { card: body, pin: undefined }

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

  try {
    const made = await createCard(wrapped.card, isPin(wrapped.pin) ? wrapped.pin : undefined)
    if (!made) return NextResponse.json({ error: 'could_not_allocate' }, { status: 500 })
    return NextResponse.json(made, { status: 201 })
  } catch (e) {
    console.error('[cards] create failed', e)
    return NextResponse.json({ error: 'storage_failed' }, { status: 503 })
  }
}
