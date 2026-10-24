'use client'

/* The card owner's own controls. Deliberately small and visually quieter than
 * the card itself: the card is for the person being handed it, these are for
 * the one holding the phone. */

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window { __cpInstallPrompt?: BeforeInstallPromptEvent | null }
}

type Platform = 'ios' | 'android' | 'desktop'

function platform(): Platform {
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

export default function OwnerStrip({
  editHref,
  qrHref,
}: {
  /** Omitted when there is nothing editable (a card defined in source). */
  editHref?: string
  /** A dedicated full-screen QR page, when the card has one. */
  qrHref?: string
}) {
  const [canPrompt, setCanPrompt] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [os, setOs] = useState<Platform>('desktop')
  /* One slot for whatever the button has to say next, so the strip never
   * grows two explanations at once. */
  const [said, setSaid] = useState<'' | 'added' | 'dismissed' | 'howto'>('')

  useEffect(() => {
    setOs(platform())
    if (window.matchMedia?.('(display-mode: standalone)').matches) setInstalled(true)

    /* The event may have fired before this component existed - the script in
     * the document head caught it either way. */
    if (window.__cpInstallPrompt) setCanPrompt(true)
    const onReady = () => setCanPrompt(true)
    const onInstalled = () => { setInstalled(true); setCanPrompt(false); setSaid('added') }
    window.addEventListener('cp:installable', onReady)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('cp:installable', onReady)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  /* Chrome can be asked. Safari cannot - iOS requires the user to go through
   * the Share sheet themselves and no amount of JavaScript changes that - so
   * the button does whichever of those is real, and says which. */
  async function install() {
    const deferred = window.__cpInstallPrompt
    if (deferred) {
      setSaid('')
      try {
        await deferred.prompt()
        const { outcome } = await deferred.userChoice
        if (outcome === 'accepted') { setInstalled(true); setSaid('added') }
        else setSaid('dismissed')
      } catch {
        setSaid('howto')
      }
      window.__cpInstallPrompt = null
      setCanPrompt(false)
      return
    }
    setSaid(s => (s === 'howto' ? '' : 'howto'))
  }

  return (
    <div className="cc-owner">
      <span className="cc-owner-label">Yours</span>
      <div className="cc-owner-row">
        {editHref && <a className="cc-chip cc-chip-hot" href={editHref}>Edit card</a>}
        {qrHref && <a className="cc-chip" href={qrHref}>Show QR</a>}
        {!installed && (
          <button className="cc-chip" onClick={install} type="button">
            {canPrompt ? 'Add to Home Screen' : 'How to add to Home Screen'}
          </button>
        )}
      </div>

      {said === 'added' && (
        <p className="cc-owner-howto cc-owner-ok">
          ✓ Added as <strong>My Card</strong>. Phones often drop a new icon on a later home-screen
          page or into the app list, so if it is not where you expect, swipe down and search{' '}
          <strong>My Card</strong>, then drag it where you want it.
        </p>
      )}

      {said === 'dismissed' && (
        <p className="cc-owner-howto">Not added. Tap the button again if you change your mind.</p>
      )}

      {said === 'howto' && os === 'ios' && (
        <p className="cc-owner-howto">
          On iPhone this is a Safari action, not something a page can trigger: tap{' '}
          <strong>Share</strong>, then <strong>Add to Home Screen</strong>. It saves as{' '}
          <strong>My Card</strong>.
        </p>
      )}

      {said === 'howto' && os === 'android' && (
        <p className="cc-owner-howto">
          Chrome has not offered the install prompt on this page yet. Open the{' '}
          <strong>⋮</strong> menu top-right, scroll down, and tap{' '}
          <strong>Install and create shortcut</strong> — older Chrome calls the same thing{' '}
          <em>Add to Home screen</em>. It saves as <strong>My Card</strong>.
        </p>
      )}

      {said === 'howto' && os === 'desktop' && (
        <p className="cc-owner-howto">
          This is a phone feature. Open the card on your phone and the button installs it there.
        </p>
      )}
    </div>
  )
}
