/* Trade a correct PIN for a fresh edit token.
 *
 * This is the whole recovery story: the owner on a new phone proves nothing
 * except that they know four digits chosen when the card was made. That is
 * deliberately weak proof, so the rate limit in unlockCard does the real
 * work, and the token it returns is new - the previous one stops working the
 * moment this succeeds. */

import { NextResponse } from 'next/server'
import { db, isPin, unlockCard } from '../../../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ slug: string }> }

export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params
  if (!db()) return NextResponse.json({ error: 'storage_unconfigured' }, { status: 503 })

  let body: { pin?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }
  if (!isPin(body.pin)) {
    return NextResponse.json({ error: 'bad_pin' }, { status: 400 })
  }

  try {
    const result = await unlockCard(slug, body.pin)
    if (result.ok) return NextResponse.json({ slug, token: result.token })

    /* 'no_pin' covers both a card with no PIN and a slug that does not
     * exist, on purpose: the difference is only useful to someone probing. */
    const status = result.reason === 'locked' ? 429 : 403
    return NextResponse.json(
      { error: result.reason, retryInMinutes: result.retryInMinutes },
      { status },
    )
  } catch (e) {
    console.error('[cards] unlock failed', e)
    return NextResponse.json({ error: 'storage_failed' }, { status: 503 })
  }
}
