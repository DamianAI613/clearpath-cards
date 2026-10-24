import { ImageResponse } from 'next/og'
import { DEFAULT_ACCENT } from '../../../lib/card'
import { readCard } from '../../../lib/db'

/* The installed app's icon: the card owner's initials on their own accent.
 *
 * Generated rather than stored, because the alternative is an image pipeline
 * and a bucket for something that is two letters and a gradient. The manifest
 * asks for two sizes from this one route. */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ slug: string }> }

function monogram(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return 'CP'
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

/* Mix the accent toward black for the gradient's far end, the same move the
 * card's cover band makes in CSS - done here by hand since the icon is
 * rasterised, not styled. */
function darken(hex: string, amount = 0.45): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#2A24A8'
  const n = parseInt(m[1], 16)
  const mix = (c: number) => Math.round(c * (1 - amount))
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255)
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params
  const asked = Number(new URL(req.url).searchParams.get('size') ?? 512)
  const size = asked === 192 ? 192 : 512

  let name = ''
  let accent = DEFAULT_ACCENT
  try {
    const row = await readCard(slug)
    if (row) {
      name = row.data.name ?? ''
      accent = row.data.accent || DEFAULT_ACCENT
    }
  } catch { /* fall back to the default mark */ }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${accent} 0%, ${darken(accent)} 100%)`,
          color: '#fff',
          fontSize: Math.round(size * 0.42),
          fontWeight: 700,
          letterSpacing: Math.round(size * 0.012),
        }}
      >
        {monogram(name)}
      </div>
    ),
    { width: size, height: size },
  )
}
