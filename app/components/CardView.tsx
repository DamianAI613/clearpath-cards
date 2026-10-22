'use client'

/* The card itself. One component, three callers: the published stored card,
 * the fragment card, and the builder's live preview. They must never drift,
 * so none of them gets its own copy of this markup.
 *
 * Layout target: everything the recipient needs without scrolling on a phone.
 * Name, what you do, Save to contacts, and the one number someone actually
 * asks for. Email, website and social links are real but secondary, so they
 * collapse behind a disclosure rather than pushing the primary action off
 * the bottom of the screen. */

import { useState } from 'react'
import {
  type Card, type CardLink, DEFAULT_ACCENT, LINK_META,
  hrefFor, displayFor, toVCard, vCardFilename,
} from '../lib/card'
import OwnerStrip from './OwnerStrip'

function monogram(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

/* What stays visible vs what collapses. A phone number is the thing people
 * ask for out loud, so it stays up top; if a card has no phone, the first
 * remaining link is promoted rather than leaving the visible slot empty. */
function split(links: CardLink[]): { shown: CardLink[]; hidden: CardLink[] } {
  const live = links.filter(l => l.value.trim())
  const phones = live.filter(l => l.kind === 'phone' || l.kind === 'sms')
  if (phones.length) return { shown: phones, hidden: live.filter(l => !phones.includes(l)) }
  return { shown: live.slice(0, 1), hidden: live.slice(1) }
}

function Row({ link, preview }: { link: CardLink; preview?: boolean }) {
  const meta = LINK_META[link.kind] ?? LINK_META.custom
  const external = !['email', 'phone', 'sms'].includes(link.kind)
  return (
    <a
      className="cc-link"
      href={hrefFor(link)}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={preview ? e => e.preventDefault() : undefined}
    >
      <span className="cc-ico" aria-hidden="true">{meta.icon}</span>
      <span style={{ minWidth: 0 }}>
        <span className="cc-link-label" style={{ display: 'block' }}>{link.label || meta.label}</span>
        <span className="cc-link-value">{displayFor(link)}</span>
      </span>
    </a>
  )
}

export default function CardView({
  card,
  preview = false,
  qr,
  editHref,
  qrHref,
  owner = false,
}: {
  card: Card
  /** Preview suppresses the real download/copy side effects in the builder. */
  preview?: boolean
  /** Data-URL QR of this card's link, or null when the link is too long. */
  qr?: string | null
  /** Where the owner edits this card. Absent for cards defined in source. */
  editHref?: string
  /** A dedicated full-screen QR page, when one exists for this card. */
  qrHref?: string
  /** True only when this browser can prove it owns the card. */
  owner?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const accent = card.accent || DEFAULT_ACCENT
  const { shown, hidden } = split(card.links)

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
    /* Revoking synchronously races the download in Safari. */
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function copyLink() {
    if (preview) return
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* permission-gated */ }
  }

  async function share() {
    if (preview) return
    const data = { title: card.name, text: card.tagline || card.title || '', url: window.location.href }
    if (typeof navigator.share === 'function') {
      try { await navigator.share(data); return } catch { /* dismissed */ }
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

      <div style={{ padding: '0 22px 12px' }}>
        <button className="cc-save" onClick={saveContact} type="button">
          Save to contacts
        </button>
      </div>

      {shown.length > 0 && (
        <div className="cc-links">
          {shown.map((l, i) => <Row key={`s${i}`} link={l} preview={preview} />)}
        </div>
      )}

      {hidden.length > 0 && (
        <details className="cc-more">
          <summary>
            {hidden.map(l => (LINK_META[l.kind] ?? LINK_META.custom).label).slice(0, 2).join(', ')}
            {hidden.length > 2 ? ` and ${hidden.length - 2} more` : ''}
          </summary>
          <div className="cc-links" style={{ paddingTop: 8 }}>
            {hidden.map((l, i) => <Row key={`h${i}`} link={l} preview={preview} />)}
          </div>
        </details>
      )}

      <div className="cc-row">
        <button className="cc-ghost" onClick={share} type="button">Share</button>
        <button className="cc-ghost" onClick={copyLink} type="button">
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
        {qr !== undefined && (
          <button className="cc-ghost" onClick={() => setShowQr(v => !v)} type="button">
            {showQr ? 'Hide QR' : 'QR'}
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

      {owner && !preview && <OwnerStrip editHref={editHref} qrHref={qrHref} />}

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
