/* Admin-side deletion. Behind the same cookie as the page that links to it,
 * because a POST route is reachable by anyone who learns its name. */

import { NextResponse } from 'next/server'
import { isAdmin } from '../../lib/admin'
import { adminDeleteCard } from '../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.redirect(new URL('/admin', req.url), { status: 303 })
  }
  const form = await req.formData()
  const slug = String(form.get('slug') ?? '').trim()
  if (slug && /^[a-z0-9-]+$/i.test(slug)) {
    try {
      await adminDeleteCard(slug)
    } catch (e) {
      console.error('[admin] delete failed', e)
    }
  }
  return NextResponse.redirect(new URL('/admin', req.url), { status: 303 })
}
