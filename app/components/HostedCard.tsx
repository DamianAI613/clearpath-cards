'use client'

/* A stored card, which unlike a fragment card always has a short URL - so its
 * QR always fits, photo or not. */

import { useEffect, useState } from 'react'
import { type Card } from '../lib/card'
import { qrDataUrl } from '../lib/qr'
import CardView from './CardView'

export default function HostedCard({ card }: { card: Card }) {
  const [qr, setQr] = useState<string | null>(null)
  useEffect(() => { qrDataUrl(window.location.href).then(setQr) }, [])
  return <CardView card={card} qr={qr} />
}
