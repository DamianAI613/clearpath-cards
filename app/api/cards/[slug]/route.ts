/* Read or rewrite one stored card.
 *
 * Authorisation is a capability, not an account: whoever holds the edit token
 * may rewrite the card, and nobody else can. The token is never stored - only
 * its SHA-256 - so a database dump does not hand out edit rights. */

import { NextResponse } from 'next/server'
import { isCard } from '../../../lib/card'
import { db, deleteCard, readCard, updateCard } from '../../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params
  if (!db()) return NextResponse.json({ error: 'storage_unconfigured' }, { status: 503 })
  try {
    const row = await readCard(slug)
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({ slug: row.slug, card: row.data })
  } catch (e) {
    console.error('[cards] read failed', e)
    return NextResponse.json({ error: 'storage_failed' }, { status: 503 })
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { slug } = await params
  if (!db()) return NextResponse.json({ error: 'storage_unconfigured' }, { status: 503 })

  let body: { token?: unknown; card?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }
  if (typeof body.token !== 'string' || !body.token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 400 })
  }
  if (!isCard(body.card)) {
    return NextResponse.json({ error: 'not_a_card' }, { status: 400 })
  }
  if (JSON.stringify(body.card).length > 400_000) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 })
  }

  try {
    const ok = await updateCard(slug, body.token, body.card)
    /* A wrong token and a missing card return the same thing on purpose:
     * otherwise this route confirms which slugs exist. */
    if (!ok) return NextResponse.json({ error: 'not_found_or_bad_token' }, { status: 404 })
    return NextResponse.json({ slug, updated: true })
  } catch (e) {
    console.error('[cards] update failed', e)
    return NextResponse.json({ error: 'storage_failed' }, { status: 503 })
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { slug } = await params
  if (!db()) return NextResponse.json({ error: 'storage_unconfigured' }, { status: 503 })

  /* The token travels in a header rather than the query string so it stays
   * out of access logs and browser history. */
  const token = req.headers.get('x-edit-token') ?? ''
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 })

  try {
    const ok = await deleteCard(slug, token)
    if (!ok) return NextResponse.json({ error: 'not_found_or_bad_token' }, { status: 404 })
    return NextResponse.json({ slug, deleted: true })
  } catch (e) {
    console.error('[cards] delete failed', e)
    return NextResponse.json({ error: 'storage_failed' }, { status: 503 })
  }
}
