'use client'

/* The card itself. One component, two callers: the published page at /c and
 * the live preview in the builder. They must never drift, so neither one gets
 * its own copy of this markup. */

import { useState } from 'react'
import {
  type Card, DEFAULT_ACCENT, LINK_META, hrefFor, displayFor, toVCard, vCardFilename,
} from '../lib/card'

function monogram(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

export default function CardView({
  card,
  preview = false,
  qr,
}: {
  card: Card
  /** Preview suppresses the real download/copy side effects in the builder. */
  preview?: boolean
  /** Data-URL QR of this card's link, or null when the link is too long to encode. */
  qr?: string | null
}) {
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const accent = card.accent || DEFAULT_ACCENT
  const links = card.links.filter(l => l.value.trim())

  function saveContact() {
    if (preview) return
    const blob = new Blob([toVCard(card)], { type: 'text/vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = vCardFilename(card)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    /* Revoke on the next tick - revoking synchronously races the download in Safari. */
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function copyLink() {
    if (preview) return
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* Clipboard is permission-gated; the user can still copy from the address bar. */
    }
  }

  async function share() {
    if (preview) return
    const data = { title: card.name, text: card.tagline || card.title || '', url: window.location.href }
    if (typeof navigator.share === 'function') {
      try { await navigator.share(data); return } catch { /* user dismissed */ }
    }
    copyLink()
  }

  return (
    <div className="cc-card cc-in" style={{ ['--cc-accent' as string]: accent }}>
      <div className="cc-cover" />

      <div className="cc-head">
        {card.photo
          ? /* eslint-disable-next-line @next/next/no-img-element */
            <img className="cc-avatar" src={card.photo} alt={card.name} />
          : <div className="cc-monogram">{monogram(card.name)}</div>}

        <h1 className="cc-name">
          {card.name || 'Your name'}
          {card.credentials && <span className="cc-creds">, {card.credentials}</span>}
        </h1>
        {card.title && <p className="cc-title">{card.title}</p>}
        {card.org && <p className="cc-org">{card.org}</p>}
        {card.tagline && <p className="cc-tagline">{card.tagline}</p>}
        {card.location && <p className="cc-loc">{card.location}</p>}
      </div>

      <div style={{ padding: '0 24px 16px' }}>
        <button className="cc-save" onClick={saveContact} type="button">
          Save to contacts
        </button>
      </div>

      {links.length > 0 && (
        <div className="cc-links">
          {links.map((l, i) => {
            const meta = LINK_META[l.kind] ?? LINK_META.custom
            const external = !['email', 'phone', 'sms'].includes(l.kind)
            return (
              <a
                key={i}
                className="cc-link"
                href={hrefFor(l)}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                onClick={preview ? e => e.preventDefault() : undefined}
              >
                <span className="cc-ico" aria-hidden="true">{meta.icon}</span>
                <span style={{ minWidth: 0 }}>
                  <span className="cc-link-label" style={{ display: 'block' }}>{l.label || meta.label}</span>
                  <span className="cc-link-value">{displayFor(l)}</span>
                </span>
              </a>
            )
          })}
        </div>
      )}

      <div className="cc-row">
        <button className="cc-ghost" onClick={share} type="button">Share</button>
        <button className="cc-ghost" onClick={copyLink} type="button">
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
        {qr !== undefined && (
          <button className="cc-ghost" onClick={() => setShowQr(v => !v)} type="button">
            {showQr ? 'Hide QR' : 'QR code'}
          </button>
        )}
      </div>

      {showQr && (
        <div className="cc-qr">
          {qr
            ? /* eslint-disable-next-line @next/next/no-img-element */
              <img src={qr} alt={`QR code linking to ${card.name}'s card`} />
            : <p className="cc-note" style={{ margin: 0 }}>
                This card carries a photo, which makes the link too long to fit in a
                scannable QR code. Remove the photo to get one.
              </p>}
        </div>
      )}

      <div className="cc-foot">
        Built with{' '}
        <a href="https://card.clearpathautomation.io" target="_blank" rel="noopener noreferrer">
          ClearPath Cards
        </a>{' '}
        — free
      </div>
    </div>
  )
}
