'use client'

/* Whose screen is this?
 *
 * /damian is a fixed route with no edit token, so there is nothing to prove
 * ownership with - it used to just assume the owner, which meant every
 * stranger handed this card saw Damian's own controls and never saw the
 * "build your own" invitation underneath them.
 *
 * Two signals say it is him: the page is running from the installed home
 * screen app, or this browser has been flagged once by opening /damian?me=1.
 * Anything else is a visitor, which is the safer default to be wrong about. */

import { useEffect, useState } from 'react'
import CardView from '../components/CardView'
import { CARD } from './card'

const FLAG = 'clearpath-cards:mine'

export default function DamianCard({ qr }: { qr: string }) {
  const [mine, setMine] = useState(false)

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('me') === '1') {
        localStorage.setItem(FLAG, '1')
        history.replaceState(null, '', window.location.pathname)
        setMine(true)
        return
      }
      const standalone = window.matchMedia?.('(display-mode: standalone)').matches
      setMine(Boolean(standalone) || localStorage.getItem(FLAG) === '1')
    } catch {
      /* private mode: treat as a visitor */
    }
  }, [])

  return <CardView card={CARD} qr={qr} owner={mine} qrHref="/damian/qr" />
}
