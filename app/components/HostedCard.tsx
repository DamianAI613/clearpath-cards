'use client'

/* A stored card. Unlike a fragment card it always has a short URL, so its QR
 * always fits — photo or not. Owner controls appear only if this browser is
 * holding the edit token for this slug. */

import { useEffect, useState } from 'react'
import { type Card } from '../lib/card'
import { tokenFor } from '../lib/owned'
import { qrDataUrl } from '../lib/qr'
import CardView from './CardView'

export default function HostedCard({ card, slug }: { card: Card; slug: string }) {
  const [qr, setQr] = useState<string | null>(null)
  const [editHref, setEditHref] = useState<string | undefined>()

  useEffect(() => {
    qrDataUrl(window.location.href).then(setQr)
    const token = tokenFor(slug)
    if (token) setEditHref(`${window.location.origin}/new#edit=${slug}:${token}`)
  }, [slug])

  return (
    <CardView
      card={card}
      slug={slug}
      qr={qr}
      owner={Boolean(editHref)}
      editHref={editHref}
      qrHref={`/s/${slug}/qr`}
    />
  )
}
