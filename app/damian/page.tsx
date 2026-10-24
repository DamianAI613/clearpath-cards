import type { Metadata } from 'next'
import QR from 'qrcode'
import DamianCard from './DamianCard'
import { CARD } from './card'

/* Damian's own card.
 *
 * This one gets a clean path instead of a fragment: it is the link that goes in
 * an email signature, so it has to be short, memorable and previewable. Being a
 * real route it also renders on the server, which is what gives it Open Graph
 * tags - the thing the fragment path cannot have. Same component, same vCard,
 * different storage. That is the dual-path idea, with the shortlink half done
 * by hand for a single card. */

export const metadata: Metadata = {
  manifest: '/damian/manifest.webmanifest',
  title: 'Damian Wroblewski, PharmD, MHA',
  description: `${CARD.title} · ${CARD.org} — ${CARD.tagline}`,
  openGraph: {
    title: 'Damian Wroblewski, PharmD, MHA',
    description: `${CARD.title} · ${CARD.org}`,
    url: 'https://card.clearpathautomation.io/damian',
    type: 'profile',
  },
}

/* The QR is baked at build time rather than generated in the browser: this
 * card's URL is fixed, so there is nothing to compute per request, and the
 * code is painted in the first frame instead of after hydration. */
const CARD_URL = 'https://card.clearpathautomation.io/damian'

export default async function DamianCardPage() {
  const qr = await QR.toDataURL(CARD_URL, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 540,
    color: { dark: '#09090B', light: '#FFFFFF' },
  })

  return (
    <main className="cc-stage">
      <DamianCard qr={qr} />
    </main>
  )
}
