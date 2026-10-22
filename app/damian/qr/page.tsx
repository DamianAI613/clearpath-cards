import type { Metadata } from 'next'
import Link from 'next/link'
import QR from 'qrcode'
import { CARD } from '../card'

/* The "someone just asked for your card" screen.
 *
 * Optimised for one thing: the seconds between being asked and their camera
 * focusing. So it is a static page with the QR baked in at build time - no
 * client-side generation, no data fetch, nothing to scroll past, and it
 * renders from cache with no network at all. White background on purpose:
 * QR scanners want contrast and phones dim dark pages less aggressively. */

const CARD_URL = 'https://card.clearpathautomation.io/damian'

export const metadata: Metadata = {
  title: 'Scan my card',
  robots: { index: false },
}

export default async function QrPage() {
  const png = await QR.toDataURL(CARD_URL, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 1200,
    color: { dark: '#000000', light: '#FFFFFF' },
  })

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: '20px 16px',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={png}
        alt={`QR code linking to ${CARD.name}'s card`}
        style={{ width: 'min(86vw, 86vh, 560px)', height: 'auto', display: 'block' }}
      />
      <p style={{ margin: 0, color: '#111827', fontSize: '1.05rem', fontWeight: 650, textAlign: 'center' }}>
        {CARD.name}
      </p>
      <p style={{ margin: 0, color: '#4B5563', fontSize: '0.92rem', textAlign: 'center' }}>
        card.clearpathautomation.io/damian
      </p>
      <Link
        href="/damian"
        style={{ marginTop: 6, color: '#4F46E5', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none' }}
      >
        Open the full card →
      </Link>
    </main>
  )
}
