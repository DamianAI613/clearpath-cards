'use client'

/* The card owner's own controls. Deliberately small and visually quieter than
 * the card itself: the card is for the person being handed it, these are for
 * the one holding the phone.
 *
 * Only rendered when this browser can prove it owns the card (it holds the
 * edit token), except on a fixed route like /damian where ownership is a
 * property of the deployment rather than of a token. */

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
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
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)
  /* Installing does not necessarily put the icon where you are looking.
   * Both platforms may drop it on a later home-screen page or straight into
   * the App Library, so the one reliable way to find it is to search. */
  const [justInstalled, setJustInstalled] = useState(false)

  useEffect(() => {
    /* Already running from the home screen - there is nothing to add. */
    if (window.matchMedia?.('(display-mode: standalone)').matches) setInstalled(true)

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', () => { setInstalled(true); setJustInstalled(true) })
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  /* Chrome fires beforeinstallprompt and lets a page ask. Safari never does -
   * iOS requires the user to go through the Share sheet themselves, and no
   * amount of JavaScript changes that. So the button does whichever is real. */
  async function install() {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') { setInstalled(true); setJustInstalled(true) }
      setDeferred(null)
      return
    }
    setShowHowTo(v => !v)
  }

  return (
    <div className="cc-owner">
      <span className="cc-owner-label">Yours</span>
      <div className="cc-owner-row">
        {editHref && (
          <a className="cc-chip cc-chip-hot" href={editHref}>Edit card</a>
        )}
        {qrHref && (
          <a className="cc-chip" href={qrHref}>Show QR</a>
        )}
        {!installed && (
          <button className="cc-chip" onClick={install} type="button">Add to Home Screen</button>
        )}
      </div>
      {showHowTo && (
        <p className="cc-owner-howto">
          On iPhone this is a Safari action, not something a page can trigger:
          tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. It saves as{' '}
          <strong>My Card</strong> — if it is not on the page you are looking at, swipe down on
          the home screen and search for that name.
        </p>
      )}
      {justInstalled && (
        <p className="cc-owner-howto">
          Added as <strong>My Card</strong>. Phones often put a new icon on a later home-screen
          page or straight into the App Library, so if it is not where you expect, swipe down and
          search <strong>My Card</strong>. Drag it where you want it from there.
        </p>
      )}
    </div>
  )
}
