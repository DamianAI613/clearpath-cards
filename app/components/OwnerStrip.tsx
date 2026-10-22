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
  appUrl = 'https://card.clearpathautomation.io',
}: {
  /** Omitted when there is nothing editable (a card defined in source). */
  editHref?: string
  /** A dedicated full-screen QR page, when the card has one. */
  qrHref?: string
  appUrl?: string
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)
  const [shared, setShared] = useState('')

  useEffect(() => {
    /* Already running from the home screen - there is nothing to add. */
    if (window.matchMedia?.('(display-mode: standalone)').matches) setInstalled(true)

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  /* Chrome fires beforeinstallprompt and lets a page ask. Safari never does -
   * iOS requires the user to go through the Share sheet themselves, and no
   * amount of JavaScript changes that. So the button does whichever is real. */
  async function install() {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferred(null)
      return
    }
    setShowHowTo(v => !v)
  }

  async function shareApp() {
    const data = {
      title: 'ClearPath Cards',
      text: 'Free digital business card — one link, a QR code, no account.',
      url: appUrl,
    }
    if (typeof navigator.share === 'function') {
      try { await navigator.share(data); return } catch { /* dismissed */ }
    }
    try {
      await navigator.clipboard.writeText(appUrl)
      setShared('Link copied')
      setTimeout(() => setShared(''), 1800)
    } catch { /* permission-gated */ }
  }

  return (
    <div className="cc-owner">
      <span className="cc-owner-label">Yours</span>
      <div className="cc-owner-row">
        {editHref && (
          <a className="cc-chip" href={editHref}>Edit</a>
        )}
        {qrHref && (
          <a className="cc-chip" href={qrHref}>Show QR</a>
        )}
        {!installed && (
          <button className="cc-chip" onClick={install} type="button">Add to Home Screen</button>
        )}
        <button className="cc-chip" onClick={shareApp} type="button">
          {shared || 'Share the app'}
        </button>
      </div>
      {showHowTo && (
        <p className="cc-owner-howto">
          On iPhone this is a Safari action, not something a page can trigger:
          tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
        </p>
      )}
    </div>
  )
}
