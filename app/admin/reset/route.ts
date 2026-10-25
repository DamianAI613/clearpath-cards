/* Zero the counters. Behind the same cookie as the page that offers it,
 * because a POST route is reachable by anyone who learns its name. */

import { NextResponse } from 'next/server'
import { isAdmin } from '../../lib/admin'
import { resetCounters } from '../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.redirect(new URL('/admin', req.url), { status: 303 })
  }
  try {
    const { events } = await resetCounters()
    return NextResponse.redirect(new URL(`/admin?reset=${events}`, req.url), { status: 303 })
  } catch (e) {
    console.error('[admin] reset failed', e)
    return NextResponse.redirect(new URL('/admin?reset=failed', req.url), { status: 303 })
  }
}
