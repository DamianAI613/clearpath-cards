import { ImageResponse } from 'next/og'
import { DEFAULT_ACCENT } from '../../lib/card'
import { readCard } from '../../lib/db'

/* The picture a messaging app shows instead of a grey box.
 *
 * iMessage, WhatsApp, Slack and LinkedIn all unfurl a link by reading its
 * Open Graph tags. This card had a title and a description and no image, so
 * iMessage had nothing to draw and fell back to "Tap to Load Preview" - the
 * least convincing thing a link can say when you have just told someone it
 * is your business card.
 *
 * It is generated from the card's own data at the card's own accent, so the
 * preview looks like the thing it opens. */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const alt = 'Digital business card'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ slug: string }> }

function monogram(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return 'CP'
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

function darken(hex: string, amount = 0.45): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#2A24A8'
  const n = parseInt(m[1], 16)
  const mix = (c: number) => Math.round(c * (1 - amount))
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => mix(v).toString(16).padStart(2, '0')).join('')}`
}

export default async function OgImage({ params }: Props) {
  const { slug } = await params

  let name = 'A digital business card'
  let title = ''
  let org = ''
  let tagline = ''
  let photo = ''
  let accent = DEFAULT_ACCENT
  try {
    const row = await readCard(slug)
    if (row) {
      const c = row.data
      name = [c.name, c.credentials].filter(Boolean).join(', ') || name
      title = c.title ?? ''
      org = c.org ?? ''
      tagline = c.tagline ?? ''
      photo = c.photo ?? ''
      accent = c.accent || DEFAULT_ACCENT
    }
  } catch { /* an unreachable database still gets a usable preview */ }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: '#09090B', color: '#FAFAFA', fontFamily: 'sans-serif',
        }}
      >
        {/* The same accent band the card itself opens with. */}
        <div style={{ height: 18, width: '100%', background: `linear-gradient(90deg, ${accent}, ${darken(accent)})`, display: 'flex' }} />

        <div style={{ display: 'flex', flex: 1, alignItems: 'center', padding: '0 72px', gap: 48 }}>
          {photo
            ? // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} width={190} height={190} alt=""
                style={{ borderRadius: 999, objectFit: 'cover', border: `6px solid ${accent}` }} />
            : <div style={{
                width: 190, height: 190, borderRadius: 999, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: `linear-gradient(135deg, ${accent}, ${darken(accent)})`,
                color: '#fff', fontSize: 76, fontWeight: 700,
              }}>{monogram(name)}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, maxWidth: 760 }}>
            <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.1, color: '#FAFAFA' }}>{name}</div>
            {title ? <div style={{ fontSize: 32, color: '#E8EDF4', marginTop: 14 }}>{title}</div> : null}
            {org ? <div style={{ fontSize: 30, color: accent, fontWeight: 600, marginTop: 6 }}>{org}</div> : null}
            {tagline ? (
              <div style={{ fontSize: 24, color: '#9AA8BC', marginTop: 18, lineHeight: 1.4 }}>
                {tagline.length > 110 ? tagline.slice(0, 107) + '…' : tagline}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 72px 36px', fontSize: 24, color: '#7C8A9E',
        }}>
          <div style={{ display: 'flex' }}>Tap to save these details to your phone</div>
          <div style={{ display: 'flex' }}>ClearPath Cards</div>
        </div>
      </div>
    ),
    size,
  )
}
