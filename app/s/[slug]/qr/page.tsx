import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import QR from 'qrcode'
import { readCard } from '../../../lib/db'

/* Every stored card gets the screen Damian's card already had: the thing you
 * open when someone asks for your card and you have about three seconds.
 *
 * White, full-bleed, nothing to scroll, and it is what the home-screen icon
 * opens. Rendered on the server so the code is in the first paint. */

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    title: 'Scan my card',
    manifest: `/s/${slug}/manifest.webmanifest`,
    robots: { index: false },
  }
}

export default async function CardQr({ params }: Props) {
  const { slug } = await params

  let row
  try {
    row = await readCard(slug)
  } catch {
    row = null
  }
  if (!row) notFound()

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://card.clearpathautomation.io'
  const url = `${base}/s/${slug}`
  const png = await QR.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 1200,
    color: { dark: '#000000', light: '#FFFFFF' },
  })

  return (
    <main
      style={{
        minHeight: '100vh', background: '#FFFFFF',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 18, padding: '20px 16px',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={png}
        alt={`QR code linking to ${row.data.name}'s card`}
        style={{ width: 'min(86vw, 86vh, 560px)', height: 'auto', display: 'block' }}
      />
      <p style={{ margin: 0, color: '#111827', fontSize: '1.05rem', fontWeight: 650, textAlign: 'center' }}>
        {row.data.name}
      </p>
      <p style={{ margin: 0, color: '#4B5563', fontSize: '0.92rem', textAlign: 'center' }}>
        Point a camera here
      </p>
      <Link
        href={`/s/${slug}`}
        style={{ marginTop: 6, color: '#4F46E5', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none' }}
      >
        Open the full card →
      </Link>
    </main>
  )
}
