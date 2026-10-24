import { ImageResponse } from 'next/og'
import { DEFAULT_ACCENT } from '../../lib/card'
import { readCard } from '../../lib/db'

/* iOS ignores the manifest's icons for Add to Home Screen and reads
 * apple-touch-icon from the page head instead. Next emits that link for this
 * file, which is the only reason it exists separately from app-icon. */

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'
export const dynamic = 'force-dynamic'

type Props = { params: { slug: string } }

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
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255)
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

export default async function AppleIcon({ params }: Props) {
  const { slug } = params
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
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${accent} 0%, ${darken(accent)} 100%)`,
          color: '#fff', fontSize: 76, fontWeight: 700, letterSpacing: 2,
        }}
      >
        {monogram(name)}
      </div>
    ),
    size,
  )
}
