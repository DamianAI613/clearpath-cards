/* The second storage path: a row in Postgres behind a short slug.
 *
 * Everything here is written so the app still works when it is absent. There
 * is no DATABASE_URL in development and there may be none in production; in
 * that case `db()` returns null and every caller falls back to the fragment.
 * The database is an upgrade to the card, never a dependency of it.
 *
 * Neon's HTTP driver is used rather than a TCP pool because these routes run
 * as short-lived serverless functions - there is no process to hold a pool
 * open, and the free plan's compute scales to zero between requests anyway.
 */

import { neon } from '@neondatabase/serverless'
import { type Card, isCard } from './card'

export type Row = {
  slug: string
  data: Card
  views: number
  updated_at: string
}

type Sql = ReturnType<typeof neon>

/* The driver's return type is a union covering its several result modes.
 * Every query here is a plain row query, so narrow once rather than at
 * each call site. */
type Rows = Record<string, unknown>[]

let _sql: Sql | null = null
let _schema: Promise<void> | null = null

export function db(): Sql | null {
  const url = process.env.DATABASE_URL
  if (!url) return null
  if (!_sql) _sql = neon(url)
  return _sql
}

/* One table, created on first use. A migration tool for a single CREATE TABLE
 * is more moving parts than the thing it manages; this is idempotent and the
 * promise is cached so it costs one round trip per cold start, not per call. */
async function ensureSchema(sql: Sql): Promise<void> {
  if (!_schema) {
    _schema = (async () => {
      await sql`
        create table if not exists cards (
          slug       text primary key,
          data       jsonb not null,
          token_hash text not null,
          views      integer not null default 0,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )`
    })().catch(e => { _schema = null; throw e })
  }
  return _schema
}

/* -- Slugs and edit tokens ---------------------------------------------- */

/* No 0/O/1/I/l - these get read aloud and typed by hand. */
const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyz'

function randomString(len: number, alphabet: string): string {
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

export const newSlug = () => randomString(8, ALPHABET)

/* The edit token is the only thing standing between a card and anyone who
 * wants to rewrite it, so it is long and never stored in the clear. */
export function newToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

/* Compare hashes, not tokens, and in constant time: a length-independent
 * early return would leak how much of a guess was correct. */
function sameHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/* -- Operations ---------------------------------------------------------- */

export async function createCard(card: Card): Promise<{ slug: string; token: string } | null> {
  const sql = db()
  if (!sql) return null
  await ensureSchema(sql)
  const token = newToken()
  const token_hash = await hashToken(token)

  /* A collision in 32^8 is vanishingly unlikely, but "vanishingly" is not
   * "never" and the cost of handling it is three lines. */
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = newSlug()
    const rows = (await sql`
      insert into cards (slug, data, token_hash)
      values (${slug}, ${JSON.stringify(card)}::jsonb, ${token_hash})
      on conflict (slug) do nothing
      returning slug`) as Rows
    if (rows.length) return { slug, token }
  }
  return null
}

export async function readCard(slug: string): Promise<Row | null> {
  const sql = db()
  if (!sql) return null
  await ensureSchema(sql)
  const rows = (await sql`select slug, data, views, updated_at from cards where slug = ${slug}`) as Rows
  const r = rows[0]
  if (!r || !isCard(r.data)) return null
  return r as unknown as Row
}

export async function updateCard(slug: string, token: string, card: Card): Promise<boolean> {
  const sql = db()
  if (!sql) return false
  await ensureSchema(sql)
  const rows = (await sql`select token_hash from cards where slug = ${slug}`) as Rows
  if (!rows.length) return false
  if (!sameHash(rows[0].token_hash as string, await hashToken(token))) return false
  await sql`
    update cards set data = ${JSON.stringify(card)}::jsonb, updated_at = now()
    where slug = ${slug}`
  return true
}

/* Deletion is permanent and there is no recovery path, which is the point:
 * someone who published their phone number must be able to make it stop
 * existing, not merely stop linking to it. */
export async function deleteCard(slug: string, token: string): Promise<boolean> {
  const sql = db()
  if (!sql) return false
  await ensureSchema(sql)
  const rows = (await sql`select token_hash from cards where slug = ${slug}`) as Rows
  if (!rows.length) return false
  if (!sameHash(rows[0].token_hash as string, await hashToken(token))) return false
  await sql`delete from cards where slug = ${slug}`
  return true
}

/* Best-effort: a view that fails to count must never fail the page. */
export async function bumpViews(slug: string): Promise<void> {
  try {
    const sql = db()
    if (!sql) return
    await sql`update cards set views = views + 1 where slug = ${slug}`
  } catch { /* counting is not the job */ }
}
