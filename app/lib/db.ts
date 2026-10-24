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
import { type Card, isCard, slugShape } from './card'

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
      /* Added after the table shipped. ADD COLUMN IF NOT EXISTS keeps this
       * idempotent, so an old database and a fresh one converge without a
       * migration step anyone has to remember to run. */
      await sql`alter table cards add column if not exists pin_hash text`
      await sql`alter table cards add column if not exists pin_salt text`
      await sql`alter table cards add column if not exists pin_tries integer not null default 0`
      await sql`alter table cards add column if not exists pin_locked_until timestamptz`
      await sql`alter table cards add column if not exists pin_locks integer not null default 0`
      await sql`alter table cards add column if not exists edits integer not null default 0`
      await sql`
        create table if not exists events (
          id   bigserial primary key,
          slug text not null,
          kind text not null,
          at   timestamptz not null default now()
        )`
      await sql`create index if not exists events_slug_idx on events (slug)`
      await sql`create index if not exists events_at_idx on events (at)`
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

export async function slugTaken(slug: string): Promise<boolean> {
  const sql = db()
  if (!sql) return false
  await ensureSchema(sql)
  const rows = (await sql`select 1 from cards where slug = ${slug}`) as Rows
  return rows.length > 0
}

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

/* -- The PIN ------------------------------------------------------------- */

/* Four digits is 10,000 possibilities, which is nothing to a machine.
 *
 * The first version of this locked the card for fifteen minutes after five
 * wrong tries and called that safe. Five tries per fifteen minutes is 480
 * guesses a day, and 10,000 / 480 is twenty-one days - a patient attacker
 * targeting one card expects to be in within ten. The rate limit has to
 * escalate, not just exist.
 *
 * So the ladder below, which is shaped around who is actually standing
 * there. A real owner fumbling their own PIN in front of someone is still
 * only locked out for thirty seconds; by the third failure in a row they
 * have clearly forgotten it and are not getting in by guessing anyway. An
 * attacker is at one or two attempts a day within the hour, which puts
 * exhaustion past twenty years.
 *
 * Offline, if the table itself leaks: PBKDF2 at 150k iterations with a
 * per-card salt makes enumerating all 10,000 cost real compute per card
 * rather than one rainbow table for all of them.
 *
 * It is still four digits. It protects a business card, not a bank. */
const PBKDF2_ITERATIONS = 150_000
const MAX_TRIES = 5
/* 30 seconds, 5 minutes, 2 hours, then doubling to a one-day ceiling. */
const LOCKOUT_LADDER = [30, 300, 7_200]
const LOCKOUT_CEILING = 86_400

function lockoutSeconds(lockNumber: number): number {
  if (lockNumber <= LOCKOUT_LADDER.length) return LOCKOUT_LADDER[lockNumber - 1]
  const doublings = lockNumber - LOCKOUT_LADDER.length
  return Math.min(LOCKOUT_CEILING, LOCKOUT_LADDER[LOCKOUT_LADDER.length - 1] * 2 ** doublings)
}

export function isPin(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}$/.test(v)
}

function newSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: PBKDF2_ITERATIONS },
    key, 256,
  )
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('')
}

export type UnlockResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'no_pin' | 'wrong' | 'locked'; retryInSeconds?: number; triesLeft?: number }

/* A correct PIN mints a FRESH token and retires the old one.
 *
 * It has to: the old token exists only as a hash, so there is nothing to hand
 * back. Rotating is the better behaviour anyway - unlocking on your new phone
 * revokes the lost one. The cost is that a saved edit link stops working after
 * an unlock, and the UI says so rather than leaving someone to discover it. */
export async function unlockCard(slug: string, pin: string): Promise<UnlockResult> {
  const sql = db()
  if (!sql) return { ok: false, reason: 'no_pin' }
  await ensureSchema(sql)

  const rows = (await sql`
    select pin_hash, pin_salt, pin_tries, pin_locked_until, pin_locks,
           (pin_locked_until is not null and pin_locked_until < now() - interval '1 day') as stale
    from cards where slug = ${slug}`) as Rows
  const r = rows[0]
  /* A card with no PIN and a card that does not exist answer identically,
   * so this route cannot be used to enumerate slugs. */
  if (!r || !r.pin_hash || !r.pin_salt) return { ok: false, reason: 'no_pin' }

  const until = r.pin_locked_until ? new Date(r.pin_locked_until as string) : null
  if (until && until.getTime() > Date.now()) {
    return {
      ok: false,
      reason: 'locked',
      retryInSeconds: Math.max(1, Math.ceil((until.getTime() - Date.now()) / 1000)),
    }
  }

  /* The ladder forgives. A card whose last lockout expired more than a day
   * ago starts again at thirty seconds, so one bad week in March does not
   * mean a two-hour wait in July. An attacker grinding continuously never
   * gets a day of silence, so it never resets for them. */
  const priorLocks = r.stale ? 0 : Number(r.pin_locks ?? 0)

  const given = await hashPin(pin, r.pin_salt as string)
  if (!sameHash(r.pin_hash as string, given)) {
    const tries = Number(r.pin_tries ?? 0) + 1
    if (tries >= MAX_TRIES) {
      const locks = priorLocks + 1
      const seconds = lockoutSeconds(locks)
      await sql`
        update cards
        set pin_tries = 0,
            pin_locks = ${locks},
            pin_locked_until = now() + (${seconds} || ' seconds')::interval
        where slug = ${slug}`
      return { ok: false, reason: 'locked', retryInSeconds: seconds }
    }
    await sql`update cards set pin_tries = ${tries}, pin_locks = ${priorLocks} where slug = ${slug}`
    return { ok: false, reason: 'wrong', triesLeft: MAX_TRIES - tries }
  }

  const token = newToken()
  await sql`
    update cards
    set token_hash = ${await hashToken(token)},
        pin_tries = 0, pin_locks = 0, pin_locked_until = null
    where slug = ${slug}`
  return { ok: true, token }
}

/* -- Operations ---------------------------------------------------------- */

export type CreateResult =
  | { ok: true; slug: string; token: string }
  | { ok: false; reason: 'taken' | 'bad_slug' | 'reserved' | 'no_slug_available' }

export async function createCard(
  card: Card,
  opts: { pin?: string; slug?: string } = {},
): Promise<CreateResult | null> {
  const sql = db()
  if (!sql) return null
  await ensureSchema(sql)
  const { pin, slug: wanted } = opts

  if (wanted !== undefined) {
    const shape = slugShape(wanted)
    if (shape !== 'ok') return { ok: false, reason: shape === 'reserved' ? 'reserved' : 'bad_slug' }
  }

  const token = newToken()
  const token_hash = await hashToken(token)
  const pin_salt = pin ? newSalt() : null
  const pin_hash = pin && pin_salt ? await hashPin(pin, pin_salt) : null

  const insert = async (slug: string) => (await sql`
    insert into cards (slug, data, token_hash, pin_hash, pin_salt)
    values (${slug}, ${JSON.stringify(card)}::jsonb, ${token_hash}, ${pin_hash}, ${pin_salt})
    on conflict (slug) do nothing
    returning slug`) as Rows

  /* A chosen slug gets exactly one attempt and a clear no. Falling back to a
   * random one would hand back a link they did not ask for, under a message
   * saying they got what they wanted. */
  if (wanted) {
    const rows = await insert(wanted)
    return rows.length ? { ok: true, slug: wanted, token } : { ok: false, reason: 'taken' }
  }

  /* A collision in 32^8 is vanishingly unlikely, but "vanishingly" is not
   * "never" and the cost of handling it is three lines. */
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = newSlug()
    const rows = await insert(slug)
    if (rows.length) return { ok: true, slug, token }
  }
  return { ok: false, reason: 'no_slug_available' }
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
    update cards
    set data = ${JSON.stringify(card)}::jsonb, updated_at = now(), edits = edits + 1
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
  /* Their card, their counters. Leaving the events behind would keep a
   * record of a person who asked to stop existing here, and would make the
   * totals disagree with the table forever. */
  await sql`delete from events where slug = ${slug}`
  return true
}

/* The same deletion, by the one person who runs the service rather than by
 * the person who owns the card. This exists because a free public card tool
 * will eventually host something abusive, and the alternative is SQL typed
 * into a database console at speed. It is reachable only behind the admin
 * password and it asks before it fires. */
export async function adminDeleteCard(slug: string): Promise<boolean> {
  const sql = db()
  if (!sql) return false
  await ensureSchema(sql)
  const rows = (await sql`delete from cards where slug = ${slug} returning slug`) as Rows
  await sql`delete from events where slug = ${slug}`
  return rows.length > 0
}

/* Best-effort: a view that fails to count must never fail the page. */
export async function bumpViews(slug: string): Promise<void> {
  try {
    const sql = db()
    if (!sql) return
    await sql`update cards set views = views + 1 where slug = ${slug}`
  } catch { /* counting is not the job */ }
}

/* -- Counting what happens ----------------------------------------------- */

/* The moments worth knowing about, and the only strings this app will store
 * in the kind column - the kind arrives from a public endpoint, so it is
 * matched against this set rather than trusted.
 *
 *   view   someone opened a card
 *   save   they tapped Save to contacts
 *   share  the card's owner sent it to someone
 *   qr     the corner code was enlarged to be scanned
 *   cta    a visitor tapped "Build your own card"
 *   out    a visitor left for clearpathautomation.io
 *   reach  a visitor opened a text or an email to ClearPath
 *
 * The last two are the funnel: cta says the card is recruiting, out says it
 * is selling. A card that was handed out through a fragment link has no row
 * to attribute these to, so they are recorded against the slug "fragment" -
 * they count in the totals and cannot appear in the per-card table. */
export const EVENT_KINDS = ['view', 'save', 'share', 'qr', 'cta', 'out', 'reach'] as const
export type EventKind = (typeof EVENT_KINDS)[number]

export function isEventKind(v: unknown): v is EventKind {
  return typeof v === 'string' && (EVENT_KINDS as readonly string[]).includes(v)
}

/* Best-effort, like the view counter: analytics must never be the reason a
 * card fails to load. No IP, no user agent, no cookie - a row says that a
 * thing happened to a card at a time, and nothing about who did it. */
export async function recordEvent(slug: string, kind: EventKind): Promise<void> {
  try {
    const sql = db()
    if (!sql) return
    await ensureSchema(sql)
    await sql`insert into events (slug, kind) values (${slug}, ${kind})`
  } catch { /* counting is not the job */ }
}

export type CardStat = {
  slug: string
  name: string
  phone: string | null
  created_at: string
  updated_at: string
  edits: number
  has_pin: boolean
  views: number
  saves: number
  shares: number
  qrs: number
  ctas: number
  outs: number
  reach: number
}

export type Stats = {
  cards: number
  cardsLast7: number
  edited: number
  views: number
  saves: number
  shares: number
  qrs: number
  ctas: number
  outs: number
  reach: number
  rows: CardStat[]
}

/* One query for the totals, one for the table. Both are read-only and only
 * ever run behind the admin cookie. */
export async function stats(limit = 200): Promise<Stats | null> {
  const sql = db()
  if (!sql) return null
  await ensureSchema(sql)

  const rows = (await sql`
    select
      c.slug,
      c.data,
      c.created_at,
      c.updated_at,
      c.edits,
      (c.pin_hash is not null) as has_pin,
      coalesce(e.views, 0)  as views,
      coalesce(e.saves, 0)  as saves,
      coalesce(e.shares, 0) as shares,
      coalesce(e.qrs, 0)    as qrs,
      coalesce(e.ctas, 0)   as ctas,
      coalesce(e.outs, 0)   as outs,
      coalesce(e.reach, 0)  as reach
    from cards c
    left join (
      select slug,
        count(*) filter (where kind = 'view')  as views,
        count(*) filter (where kind = 'save')  as saves,
        count(*) filter (where kind = 'share') as shares,
        count(*) filter (where kind = 'qr')    as qrs,
        count(*) filter (where kind = 'cta')   as ctas,
        count(*) filter (where kind = 'out')   as outs,
        count(*) filter (where kind = 'reach') as reach
      from events group by slug
    ) e on e.slug = c.slug
    order by c.created_at desc
    limit ${limit}`) as Rows

  const out: CardStat[] = rows.map(r => {
    const card = r.data as Card
    const phone = card?.links?.find(l => l.kind === 'phone' || l.kind === 'sms')?.value?.trim() || null
    return {
      slug: String(r.slug),
      name: (card?.name || '').trim() || '(no name)',
      phone,
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
      edits: Number(r.edits ?? 0),
      has_pin: Boolean(r.has_pin),
      views: Number(r.views ?? 0),
      saves: Number(r.saves ?? 0),
      shares: Number(r.shares ?? 0),
      qrs: Number(r.qrs ?? 0),
      ctas: Number(r.ctas ?? 0),
      outs: Number(r.outs ?? 0),
      reach: Number(r.reach ?? 0),
    }
  })

  const totals = (await sql`
    select
      (select count(*) from cards)                                        as cards,
      (select count(*) from cards where created_at > now() - interval '7 days') as last7,
      (select count(*) from cards where edits > 0)                        as edited,
      (select count(*) from events where kind = 'view')                   as views,
      (select count(*) from events where kind = 'save')                   as saves,
      (select count(*) from events where kind = 'share')                  as shares,
      (select count(*) from events where kind = 'qr')                     as qrs,
      (select count(*) from events where kind = 'cta')                    as ctas,
      (select count(*) from events where kind = 'out')                    as outs,
      (select count(*) from events where kind = 'reach')                  as reach`) as Rows
  const t = totals[0] ?? {}

  return {
    cards: Number(t.cards ?? 0),
    cardsLast7: Number(t.last7 ?? 0),
    edited: Number(t.edited ?? 0),
    views: Number(t.views ?? 0),
    saves: Number(t.saves ?? 0),
    shares: Number(t.shares ?? 0),
    qrs: Number(t.qrs ?? 0),
    ctas: Number(t.ctas ?? 0),
    outs: Number(t.outs ?? 0),
    reach: Number(t.reach ?? 0),
    rows: out,
  }
}
