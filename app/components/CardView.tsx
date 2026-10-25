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

import { useEffect, useState } from 'react'
import {
  type Card, type CardLink, DEFAULT_ACCENT, LINK_META,
  hrefFor, displayFor, toVCard, vCardFilename,
} from '../lib/card'
import { ping } from '../lib/track'
import { useFit } from '../lib/useFit'
import OwnerStrip from './OwnerStrip'
import UnlockEdit from './UnlockEdit'

/* ClearPath's own contact details, on every card's footer. The sms: route
 * is a button rather than a link because iOS and Android disagree about the
 * separator and each rejects the other's. */
const CP_PHONE = '+12246280264'
const CP_EMAIL = 'info@clearpathautomation.io'
const CP_ASK = 'Hi ClearPath — I found you through a ClearPath card. I would like to talk about a project.'

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
  slug,
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
  /** Present for a stored card. Enables counting and PIN unlock; a fragment
   * card has no row, so neither applies. */
  slug?: string
}) {
  const [note, setNote] = useState('')
  const [showShare, setShowShare] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  /* The builder's preview lives in a column, not on a phone, so it is
   * measured against the wrong thing and must not be scaled. */
  const { ref, scale, pull } = useFit(!preview)
  /* Detected after mount, never during render: the server has no navigator,
   * and deciding this during render would be a hydration mismatch on every
   * card in the product. */
  const [canSheet, setCanSheet] = useState(false)
  const [canNfc, setCanNfc] = useState(false)
  useEffect(() => {
    setCanSheet(typeof navigator.share === 'function')
    setCanNfc('NDEFReader' in window)
  }, [])
  const accent = card.accent || DEFAULT_ACCENT
  const { shown, hidden } = split(card.links)

  function saveContact() {
    if (preview) return
    ping(slug ?? 'fragment', 'save')
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

  /* ClearPath's own text line. iOS and Android disagree about the separator
   * in an sms: URL and each rejects the other's, so this picks per platform
   * rather than being wrong half the time. */
  function textClearPath() {
    if (preview) return
    ping(slug ?? 'fragment', 'reach')
    const ua = navigator.userAgent || ''
    const ios = /iPad|iPhone|iPod/.test(ua)
    window.location.href = `sms:${CP_PHONE}${ios ? '&' : '?'}body=${encodeURIComponent(CP_ASK)}`
  }

  /* Handing someone your card is one intention with several shapes, and
   * which one is right depends on who is standing there: a text to a client,
   * AirDrop to the person beside you, an email to someone who reads it on
   * Monday. Going straight into Messages decided that for them.
   *
   * What is deliberately NOT here is a button per chat app. The operating
   * system's own share sheet already lists Messenger, WhatsApp, AirDrop and
   * whatever else is installed, and it is always right about which of those
   * exist - a hard-coded Messenger button is a dead end on a phone without
   * Messenger. */
  function shareText(): { url: string; body: string } {
    const url = window.location.href
    const who = card.name.trim()
    return {
      url,
      body: who
        ? `${who} — contact details and links, all on one page: ${url}`
        : `My contact details and links, all on one page: ${url}`,
    }
  }

  function viaText() {
    if (preview) return
    ping(slug ?? 'fragment', 'share')
    const { body } = shareText()
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent || '')
    window.location.href = `sms:${ios ? '&' : '?'}body=${encodeURIComponent(body)}`
  }

  function viaEmail() {
    if (preview) return
    ping(slug ?? 'fragment', 'share')
    const { url, body } = shareText()
    const subject = card.name.trim() ? `${card.name.trim()} — contact details` : 'My contact details'
    window.location.href =
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${body}\n\n${url}`)}`
  }

  async function viaSheet() {
    if (preview) return
    ping(slug ?? 'fragment', 'share')
    const { url, body } = shareText()
    try {
      await navigator.share({ title: card.name.trim() || 'Digital card', text: body, url })
    } catch { /* dismissed */ }
  }

  async function viaCopy() {
    if (preview) return
    ping(slug ?? 'fragment', 'share')
    try {
      await navigator.clipboard.writeText(window.location.href)
      setNote('Link copied ✓')
      setTimeout(() => setNote(''), 1800)
    } catch { /* permission-gated */ }
  }

  /* Web NFC writes a link onto a blank tag or sticker - the kind you stick
   * to the back of a printed card. It is not phone-to-phone: Android Beam is
   * gone and iOS has never exposed NFC writing to the web at all. So the
   * button appears only where the API exists, and it says what it does. */
  async function viaNfc() {
    if (preview) return
    type NdefCtor = new () => { write: (message: unknown) => Promise<void> }
    const Ctor = (window as unknown as { NDEFReader?: NdefCtor }).NDEFReader
    if (!Ctor) return
    setNote('Hold a blank NFC tag to your phone…')
    try {
      await new Ctor().write({ records: [{ recordType: 'url', data: window.location.href }] })
      ping(slug ?? 'fragment', 'share')
      setNote('Written to the tag ✓')
    } catch {
      setNote('Nothing written — reposition the tag and try again.')
    }
    setTimeout(() => setNote(''), 4000)
  }

  return (
    <div
      ref={ref}
      className="cc-card cc-in"
      style={{
        ['--cc-accent' as string]: accent,
        ...(scale < 1
          ? { transform: `scale(${scale})`, transformOrigin: 'top center', marginBottom: -pull }
          : null),
      }}
    >
      <div className="cc-cover" />

      {/* The card's own QR, parked in the corner where it costs no vertical
        * space. Small enough to ignore, close enough to scan, and a tap
        * blows it up to fill the card for someone standing further away. */}
      {qr && (
        <button
          className="cc-qrmini"
          type="button"
          onClick={() => { ping(slug ?? 'fragment', 'qr'); setShowQr(true) }}
          aria-label="Show a larger QR code for this card"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="" />
          {/* "Press me", not "scan me": at 74px this is too small to scan
            * across a table, and pressing it is the action that makes it
            * scannable. Telling someone to scan a thing they must first
            * tap is an instruction that fails on the first try. */}
          <span>Press me</span>
        </button>
      )}

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
        {/* Clamped to two lines on a short screen, where those lines are the
          * cheapest thing to give back. Tapping shows the rest, because
          * truncating someone's own words with no way to read them is not a
          * layout decision, it is a deletion. */}
        {card.tagline && (
          <p
            className={tagOpen ? 'cc-tagline cc-tagline-open' : 'cc-tagline'}
            onClick={() => setTagOpen(v => !v)}
          >
            {card.tagline}
          </p>
        )}
        {card.location && <p className="cc-loc">{card.location}</p>}
      </div>

      <div className="cc-acts">
        <button className="cc-save" onClick={saveContact} type="button">
          Save to contacts
        </button>
        <button className="cc-share" onClick={() => setShowShare(v => !v)} type="button" aria-expanded={showShare}>
          {note || (showShare ? 'Share this info ▴' : 'Share this info ▾')}
        </button>

        {showShare && !preview && (
          <div className="cc-sharemenu">
            <button className="cc-sharebtn" onClick={viaText} type="button">Text message</button>
            <button className="cc-sharebtn" onClick={viaEmail} type="button">Email</button>
            {canSheet && (
              <button className="cc-sharebtn" onClick={viaSheet} type="button">AirDrop, Messenger, more…</button>
            )}
            <button className="cc-sharebtn" onClick={viaCopy} type="button">Copy link</button>
            {canNfc && (
              <button className="cc-sharebtn" onClick={viaNfc} type="button">Write to an NFC tag</button>
            )}
          </div>
        )}
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

      {owner && !preview && <OwnerStrip editHref={editHref} qrHref={qrHref} />}

      {/* The footer earns its height twice: it is how a card someone was
        * handed turns into a card someone makes, and it is the only place
        * the business behind the free tool is named. The owner does not
        * need a Build button - they are holding the thing it builds. */}
      <div className="cc-foot">
        <a
          className="cc-cta"
          href="https://card.clearpathautomation.io/new"
          onClick={preview ? e => e.preventDefault() : () => ping(slug ?? 'fragment', 'cta')}
        >
          Build your own card — free
        </a>
        <a
          className="cc-footlink"
          href="https://clearpathautomation.io"
          target="_blank"
          rel="noopener noreferrer"
          onClick={preview ? e => e.preventDefault() : () => ping(slug ?? 'fragment', 'out')}
        >
          See what else ClearPath can do for you ↗
        </a>
        {/* A way to start the conversation without leaving for a website
          * and hunting for a contact form. Both open the reader's own app
          * with the message half-written; nothing is relayed through this
          * server, so there is no form here for a bot to find. */}
        <div className="cc-reach">
          <button className="cc-reach-btn" type="button" onClick={textClearPath}>Text ClearPath</button>
          <a
            className="cc-reach-btn"
            href={`mailto:${CP_EMAIL}?subject=${encodeURIComponent('Project enquiry')}&body=${encodeURIComponent(CP_ASK)}`}
            onClick={preview ? e => e.preventDefault() : () => ping(slug ?? 'fragment', 'reach')}
          >
            Email ClearPath
          </a>
        </div>
        {slug && !owner && !preview && <UnlockEdit slug={slug} />}
      </div>

      {showQr && qr && (
        <div
          className="cc-qrbig"
          role="dialog"
          aria-label="QR code for this card"
          onClick={() => setShowQr(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR code linking to ${card.name || 'this'} card`} />
          <p className="cc-qrbig-cap">Scan me for a quick download</p>
          <p className="cc-qrbig-sub">Tap anywhere to close</p>
        </div>
      )}
    </div>
  )
}
