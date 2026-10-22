import type { Metadata } from 'next'
import CardView from '../components/CardView'
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

export default function DamianCard() {
  return (
    <main className="cc-stage">
      <CardView card={CARD} owner qrHref="/damian/qr" />
    </main>
  )
}
