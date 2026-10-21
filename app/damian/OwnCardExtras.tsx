'use client'

/* The QR for a fixed-path card is generated from the page URL at runtime, so
 * the same component works on localhost, on a preview deployment and on the
 * real domain without anything hardcoded. */

import { useEffect, useState } from 'react'
import { qrDataUrl } from '../lib/qr'

export default function OwnCardExtras() {
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => { qrDataUrl(window.location.href).then(setQr) }, [])

  if (!qr) return null

  return (
    <div style={{ textAlign: 'center', marginTop: 26 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="QR code for this card" width={164} height={164}
        style={{ background: '#fff', padding: 10, borderRadius: 12 }} />
      <p className="cc-note" style={{ marginTop: 10 }}>Point a camera here</p>
    </div>
  )
}
