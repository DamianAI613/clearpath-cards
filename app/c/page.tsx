'use client'

/* A published card, read from the URL fragment.
 *
 * The fragment is never sent to the server, so this page cannot be rendered
 * on one - the decode has to happen in the browser, after mount. That is the
 * cost of the database-free path and it is paid here, in one useEffect. */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { type Card } from '../lib/card'
import { decodeCard } from '../lib/codec'
import { qrDataUrl } from '../lib/qr'
import CardView from '../components/CardView'

type State =
  | { phase: 'loading' }
  | { phase: 'empty' }
  | { phase: 'bad' }
  | { phase: 'ready'; card: Card }

export default function CardPage() {
  const [state, setState] = useState<State>({ phase: 'loading' })
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    function read() {
      const frag = window.location.hash.slice(1)
      if (!frag) { setState({ phase: 'empty' }); return }
      const card = decodeCard(frag)
      if (!card) { setState({ phase: 'bad' }); return }
      setState({ phase: 'ready', card })
      qrDataUrl(window.location.href).then(setQr)
    }
    read()
    /* Someone pasting a different card into the same tab should get that card. */
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])

  /* The tab title is set imperatively, on a timer, and that needs explaining.
   * App Router renders <title> inside the React tree and commits it during
   * hydration, which lands *after* a normal effect - so the obvious version of
   * this gets silently reverted a tick later. The card only exists in the
   * fragment, so there is no server-rendered title to configure instead. One
   * deferred write after hydration has settled is the honest cost of that. */
  useEffect(() => {
    if (state.phase !== 'ready') return
    const name = state.card.name.trim()
    const t = setTimeout(() => {
      document.title = name ? `${name} — ClearPath Cards` : 'ClearPath Cards'
    }, 150)
    return () => clearTimeout(t)
  }, [state])

  return (
    <main className="cc-stage">
      {state.phase === 'loading' && (
        <p className="cc-note" style={{ marginTop: 80 }}>Opening card…</p>
      )}

      {state.phase === 'ready' && <CardView card={state.card} qr={qr} />}

      {(state.phase === 'empty' || state.phase === 'bad') && (
        <div className="cc-panel" style={{ maxWidth: 420, marginTop: 70, textAlign: 'center' }}>
          <h1 className="cc-h2">
            {state.phase === 'bad' ? 'That link is damaged' : 'No card in this link'}
          </h1>
          <p className="cc-note" style={{ marginBottom: 22 }}>
            {state.phase === 'bad'
              ? 'A card travels inside the link itself, so if the link was cut short or edited in transit there is nothing left to open. Ask for it again — preferably as a tap, not a paste.'
              : 'A card link carries its card after the #. This one has nothing after it.'}
          </p>
          <Link className="cc-btn" href="/new">Make your own card</Link>
        </div>
      )}
    </main>
  )
}
