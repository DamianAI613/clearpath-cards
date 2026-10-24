/* Who may see the numbers.
 *
 * One password in an environment variable, exchanged for an httpOnly cookie.
 * No user table, no sessions table, no library: there is exactly one person
 * who is allowed in and he set the password himself. The cookie holds a hash
 * of the password rather than the password, so reading it off a device does
 * not hand over the thing that was typed. */

import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'cp_admin'

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD)
}

async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('')
}

/* Salted with a constant so the cookie is not the same string as a hash of
 * the password that might appear in some other system. */
export async function adminCookieValue(password: string): Promise<string> {
  return sha256(`clearpath-admin-v1:${password}`)
}

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function isAdmin(): Promise<boolean> {
  const secret = process.env.ADMIN_PASSWORD
  if (!secret) return false
  const jar = await cookies()
  const got = jar.get(ADMIN_COOKIE)?.value
  if (!got) return false
  return same(got, await adminCookieValue(secret))
}

export async function passwordMatches(given: string): Promise<boolean> {
  const secret = process.env.ADMIN_PASSWORD
  if (!secret) return false
  /* Hash both sides before comparing so the comparison is over fixed-length
   * strings and cannot leak the password's length. */
  return same(await sha256(given), await sha256(secret))
}
