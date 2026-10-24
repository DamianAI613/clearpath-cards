/* ClearPath Cards - the card model and its two codecs.
 *
 * A card is a plain JSON object. That is the whole contract. Everything else
 * here turns that object into something else: a URL fragment, a .vcf file, a
 * set of tappable links. Nothing in this file touches a database or a network,
 * which is the point - the fragment path has to keep working when every
 * dependency is gone.
 */

export type LinkKind =
  | 'email' | 'phone' | 'sms' | 'website' | 'linkedin' | 'github'
  | 'x' | 'instagram' | 'facebook' | 'youtube' | 'calendar' | 'address' | 'custom'

export type CardLink = {
  kind: LinkKind
  label: string
  value: string
}

export type Card = {
  /* schema version - bump only on a breaking shape change, and keep the
   * decoder able to read every older number. Old links must never rot. */
  v: 1
  name: string
  credentials?: string   // "PharmD, MHA" - rendered after the name
  title?: string
  org?: string
  tagline?: string
  location?: string
  photo?: string         // data URL, downscaled to 320px on upload
  accent?: string        // hex, defaults to ClearPath indigo
  links: CardLink[]
}

export const DEFAULT_ACCENT = '#4F46E5'

export const EMPTY_CARD: Card = { v: 1, name: '', links: [] }

/* -- Link presentation -------------------------------------------------- */

/* Icons are short glyphs or initials, never emoji and never an exotic
 * codepoint. A card renders on someone else's phone, on whatever font stack it
 * has, and a glyph that falls back to a tofu box is worse than two letters.
 * ⌥ for GitHub rendered as a meaningless mark - hence 'GH'. */
/* Declaration order is UI order: the builder's chips and its kind dropdown
 * both read this object's keys. The first four are what a business card is
 * actually for and what travels into a saved contact; the rest are places
 * someone might also be. */
export const LINK_META: Record<LinkKind, { label: string; icon: string; placeholder: string }> = {
  phone:     { label: 'Phone',     icon: '☎',   placeholder: '+1 555 555 5555' },
  email:     { label: 'Email',     icon: '@',   placeholder: 'you@company.com' },
  website:   { label: 'Website',   icon: '◎',   placeholder: 'company.com' },
  address:   { label: 'Address',   icon: 'LOC', placeholder: 'City, ST' },
  sms:       { label: 'Text',      icon: 'TXT', placeholder: '+1 555 555 5555' },
  linkedin:  { label: 'LinkedIn',  icon: 'in',  placeholder: 'linkedin.com/in/you' },
  github:    { label: 'GitHub',    icon: 'GH',  placeholder: 'github.com/you' },
  x:         { label: 'X',         icon: 'X',   placeholder: 'x.com/you' },
  instagram: { label: 'Instagram', icon: 'IG',  placeholder: 'instagram.com/you' },
  facebook:  { label: 'Facebook',  icon: 'f',   placeholder: 'facebook.com/you' },
  youtube:   { label: 'YouTube',   icon: '▶',   placeholder: 'youtube.com/@you' },
  calendar:  { label: 'Book time', icon: 'CAL', placeholder: 'cal.com/you' },
  custom:    { label: 'Link',      icon: '→',   placeholder: 'https://...' },
}

/** The href a tapped link should open. Bare domains get https:// so a user
 *  typing "company.com" does not produce a relative link to nowhere. */
export function hrefFor(link: CardLink): string {
  const v = link.value.trim()
  if (!v) return '#'
  switch (link.kind) {
    case 'email': return `mailto:${v}`
    case 'phone': return `tel:${v.replace(/[^\d+]/g, '')}`
    case 'sms':   return `sms:${v.replace(/[^\d+]/g, '')}`
    case 'address': return `https://maps.google.com/?q=${encodeURIComponent(v)}`
    default:
      return /^https?:\/\//i.test(v) ? v : `https://${v.replace(/^\/+/, '')}`
  }
}

/** What the user reads on the button - never a raw protocol prefix. */
export function displayFor(link: CardLink): string {
  const v = link.value.trim()
  if (link.kind === 'email' || link.kind === 'phone' || link.kind === 'sms' || link.kind === 'address') return v
  return v.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
}

/* -- vCard -------------------------------------------------------------- */

/* vCard escaping, split in two on purpose.
 *
 * In a structured field (N, ADR) the comma separates repeated components, so
 * it has to be escaped. In a plain text field (FN, ORG, TITLE, NOTE) it does
 * not, and escaping it anyway is how you end up with "Ada Lovelace\, FRS"
 * showing literally in someone's phone - the one place a card cannot look
 * broken. Strictly RFC 2426 permits the escape; too many parsers mishandle it. */
function escText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;')
}
function escStruct(s: string): string {
  return escText(s).replace(/,/g, '\\,')
}

export function toVCard(card: Card): string {
  const parts = card.name.trim().split(/\s+/)
  const last = parts.length > 1 ? parts[parts.length - 1] : ''
  const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : card.name
  const full = card.credentials ? `${card.name}, ${card.credentials}` : card.name

  const L: string[] = ['BEGIN:VCARD', 'VERSION:3.0']
  L.push(`N:${escStruct(last)};${escStruct(first)};;;${escStruct(card.credentials || '')}`)
  L.push(`FN:${escText(full)}`)
  if (card.org)   L.push(`ORG:${escText(card.org)}`)
  if (card.title) L.push(`TITLE:${escText(card.title)}`)
  if (card.tagline) L.push(`NOTE:${escText(card.tagline)}`)

  for (const l of card.links) {
    const v = l.value.trim()
    if (!v) continue
    switch (l.kind) {
      case 'email': L.push(`EMAIL;TYPE=INTERNET,WORK:${escText(v)}`); break
      case 'phone': L.push(`TEL;TYPE=WORK,VOICE:${escText(v)}`); break
      case 'sms':   L.push(`TEL;TYPE=CELL,TEXT:${escText(v)}`); break
      case 'address': L.push(`ADR;TYPE=WORK:;;${escStruct(v)};;;;`); break
      default: L.push(`URL:${escText(hrefFor(l))}`)
    }
  }
  /* The location line is written for a human reading the card ("Chicago, IL ·
   * remote across the US"); a contacts app wants the place, not the sentence.
   * Keep the part before the separator and drop the editorial. */
  if (card.location && !card.links.some(l => l.kind === 'address')) {
    const place = card.location.split(/\s[·|]\s/)[0].trim()
    if (place) L.push(`ADR;TYPE=WORK:;;${escStruct(place)};;;;`)
  }

  /* A data-URL photo embeds as base64. Strip the prefix, keep the subtype. */
  if (card.photo?.startsWith('data:image/')) {
    const m = card.photo.match(/^data:image\/(\w+);base64,(.+)$/)
    if (m) {
      const type = m[1].toUpperCase() === 'JPG' ? 'JPEG' : m[1].toUpperCase()
      /* vCard 3.0 folds long lines at 75 octets, continuation lines start with a space. */
      const folded = m[2].match(/.{1,70}/g)?.join('\r\n ') ?? m[2]
      L.push(`PHOTO;ENCODING=b;TYPE=${type}:${folded}`)
    }
  }

  L.push('REV:' + new Date().toISOString().replace(/\.\d{3}/, ''))
  L.push('END:VCARD')
  return L.join('\r\n')
}

export function vCardFilename(card: Card): string {
  const slug = (card.name || 'contact').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${slug || 'contact'}.vcf`
}

/* -- Validation --------------------------------------------------------- */

export function isCard(x: unknown): x is Card {
  if (!x || typeof x !== 'object') return false
  const c = x as Partial<Card>
  if (typeof c.name !== 'string') return false
  if (!Array.isArray(c.links)) return false
  return c.links.every(l => l && typeof l === 'object' && typeof (l as CardLink).value === 'string')
}

/* -- Chosen links -------------------------------------------------------- */

/* A slug someone picked rather than one the machine rolled.
 *
 * Lowercase so it survives being read aloud and retyped, dashes but not at
 * either end, 3 to 32 characters. The length floor is not arbitrary: one and
 * two character slugs are the scarce ones, and handing them out first-come
 * to whoever publishes a test card is a decision that cannot be undone.
 *
 * These live here rather than beside the database because the builder needs
 * them too, and importing the storage module into the browser would ship a
 * Postgres driver to a phone. */
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/

/* Nothing here collides with a route - cards live under /s/ - but a card at
 * /s/admin or /s/clearpath is a phishing surface, and "support" in a URL is
 * worth more to someone lying than to someone honest. */
const RESERVED_SLUGS = new Set([
  'about', 'admin', 'api', 'app', 'apple-icon', 'app-icon', 'billing', 'c', 'card', 'cards',
  'clearpath', 'clearpathautomation', 'contact', 'damian', 'favicon', 'help', 'icon', 'login',
  'logout', 'manifest', 'new', 'owner', 'pay', 'privacy', 'qr', 'robots', 's', 'security',
  'settings', 'signup', 'sitemap', 'support', 'terms', 'unlock', 'www',
])

export function slugShape(v: unknown): 'ok' | 'bad' | 'reserved' {
  if (typeof v !== 'string' || !SLUG_RE.test(v)) return 'bad'
  return RESERVED_SLUGS.has(v) ? 'reserved' : 'ok'
}

/* A first guess from their name. Offered, never imposed - it is prefilled
 * and editable, and clearing it goes back to a random link. */
export function suggestSlug(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .replace(/-+$/, '')
  return base.length >= 3 ? base : ''
}
