/* The only way to set the admin cookie, and the only way to clear it. */

import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, adminCookieValue, adminConfigured, passwordMatches } from '../../lib/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const form = await req.formData()

  if (form.get('logout')) {
    const res = NextResponse.redirect(new URL('/admin', req.url), { status: 303 })
    res.cookies.delete(ADMIN_COOKIE)
    return res
  }

  const password = String(form.get('password') ?? '')
  if (!adminConfigured() || !(await passwordMatches(password))) {
    /* The failure never says which part was wrong, and never echoes what was
     * typed back into a URL. */
    return NextResponse.redirect(new URL('/admin?e=1', req.url), { status: 303 })
  }

  const res = NextResponse.redirect(new URL('/admin', req.url), { status: 303 })
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: await adminCookieValue(password),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
