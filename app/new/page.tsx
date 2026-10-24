'use client'

/* The builder. Four steps, a live preview, and a publish step that produces a
 * link with no row behind it. Draft state is mirrored to localStorage because
 * losing a half-finished card to an accidental refresh is unforgivable in a
 * tool whose entire pitch is "two minutes". */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  type Card, type CardLink, type LinkKind,
  DEFAULT_ACCENT, EMPTY_CARD, LINK_META, isCard, slugShape, suggestSlug,
} from '../lib/card'
import { cardUrl, decodeCard, encodeCard } from '../lib/codec'
import { rememberOwned } from '../lib/owned'
import { downscale } from '../lib/photo'
import { qrDataUrl } from '../lib/qr'
import CardView from '../components/CardView'

type Published = { url: string; editUrl?: string; stored: boolean; updated?: boolean }

/* The edit token rides in the fragment, like the cards themselves, so that
 * handing someone a card link and handing someone edit rights stay visibly
 * different things. */
const editHref = (origin: string, slug: string, token: string) =>
  `${origin}/new#edit=${slug}:${token}`

/* "900 seconds" is not an answer anyone can act on. */
function humanWait(seconds: number): string {
  if (seconds < 90) return `${Math.max(5, Math.round(seconds / 5) * 5)} seconds`
  const mins = Math.ceil(seconds / 60)
  if (mins < 90) return `${mins} minute${mins === 1 ? '' : 's'}`
  const hours = Math.ceil(mins / 60)
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

const DRAFT_KEY = 'clearpath-cards:draft'
const STEPS = ['Who you are', 'Photo', 'Links', 'Publish']

/* Long enough that some chat apps and QR codes start to struggle. */
const LONG_URL = 1800

/* Every accent here carries white text at 4.7:1 or better - the card's own
 * buttons sit on it. A lighter hue would look fine and read badly. */
const ACCENTS = [
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Teal', hex: '#0F766E' },
  { name: 'Amber', hex: '#B45309' },
  { name: 'Rose', hex: '#E11D48' },
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Slate', hex: '#475569' },
]

export default function NewCardPage() {
  const [step, setStep] = useState(0)
  const [card, setCard] = useState<Card>(EMPTY_CARD)
  const [photoErr, setPhotoErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loaded, setLoaded] = useState(false)

  /* A published result. `stored` distinguishes the two storage paths, because
   * what the user can do next differs: a stored card can be edited in place,
   * a fragment card cannot. */
  const [pub, setPub] = useState<Published | null>(null)
  /* Set when this session holds the edit token for an existing stored card.
   * Publishing then rewrites that row instead of creating another. */
  const [editing, setEditing] = useState<{ slug: string; token: string } | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [loadInput, setLoadInput] = useState('')
  const [loadMsg, setLoadMsg] = useState('')
  /* A public card link was pasted. Its PIN unlocks the original; without
   * the PIN all we can honestly offer is a copy. */
  const [pending, setPending] = useState<{ slug: string; name: string } | null>(null)
  const [pendingPin, setPendingPin] = useState('')
  const [pendingBusy, setPendingBusy] = useState(false)
  /* Four digits, chosen at publish time, that let the owner edit from a phone
   * that has never seen this browser's localStorage. It is sent once, hashed
   * server-side, and never stored here. */
  const [pin, setPin] = useState('')
  /* The link they choose, prefilled from their name and editable. Empty
   * means "give me a random one", which is what every card got before. */
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugState, setSlugState] = useState<'idle' | 'checking' | 'free' | 'taken' | 'bad' | 'reserved' | 'unknown'>('idle')

  /* On mount: an edit link wins over a saved draft, then fall back to the
   * draft. The edit token travels in the fragment rather than the query
   * string so it never reaches the server in a page request - the only place
   * it is ever transmitted is the PATCH that uses it. */
  useEffect(() => {
    const m = /(?:^|[#&])edit=([a-z0-9-]+):([a-f0-9]+)/i.exec(window.location.hash)
    if (m) {
      const [, slug, token] = m
      setLoadMsg('Loading your card…')
      fetch(`/api/cards/${slug}`)
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then(({ card: c }) => {
          if (!isCard(c)) throw new Error('bad card')
          setCard(c)
          setEditing({ slug, token })
          rememberOwned(slug, token)
          setLoadMsg('')
        })
        .catch(() => setLoadMsg('That edit link did not open — the card may have been removed.'))
        .finally(() => setLoaded(true))
      return
    }
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (isCard(parsed)) setCard(parsed)
      }
    } catch { /* a corrupt draft is not worth a crash */ }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(card)) } catch { /* private mode */ }
  }, [card, loaded])

  const set = useCallback(<K extends keyof Card>(k: K, v: Card[K]) => {
    setCard(c => ({ ...c, [k]: v }))
  }, [])

  /* Prefill from the name, but stop the moment they type their own: an
   * input that keeps rewriting itself under the cursor is infuriating. */
  useEffect(() => {
    if (editing || slugTouched) return
    setSlug(suggestSlug(card.name))
  }, [card.name, editing, slugTouched])

  /* Availability, debounced. The answer is about a public URL and tells the
   * asker nothing they could not learn by opening it. */
  useEffect(() => {
    if (editing) return
    const s = slug.trim()
    if (!s) { setSlugState('idle'); return }
    const shape = slugShape(s)
    if (shape !== 'ok') { setSlugState(shape); return }
    setSlugState('checking')
    let alive = true
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/cards?slug=${encodeURIComponent(s)}`)
        const { available, reason } = await r.json()
        /* "Not available" and "could not ask" are different answers, and
         * telling someone their link is taken when the database simply did
         * not reply would send them off renaming themselves for nothing. */
        const unreachable = reason === 'storage_unconfigured' || reason === 'storage_failed'
        if (alive) setSlugState(available ? 'free' : unreachable ? 'unknown' : 'taken')
      } catch {
        if (alive) setSlugState('unknown')
      }
    }, 400)
    return () => { alive = false; clearTimeout(t) }
  }, [slug, editing])

  const encodedLength = useMemo(() => encodeCard(card).length, [card])
  const pinOk = /^\d{4}$/.test(pin)
  /* A PIN is required for a new card and meaningless for an edit, where the
   * card already has one and the token in hand is the proof. */
  const slugOk = !slug.trim() || slugState === 'free' || slugState === 'unknown'
  const ready = card.name.trim().length > 0 && (Boolean(editing) || (pinOk && slugOk))

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoErr('')
    setBusy(true)
    try {
      set('photo', await downscale(file))
    } catch (err) {
      setPhotoErr(err instanceof Error ? err.message : 'That image could not be used.')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  function addLink(kind: LinkKind) {
    setCard(c => ({ ...c, links: [...c.links, { kind, label: LINK_META[kind].label, value: '' }] }))
  }
  function editLink(i: number, patch: Partial<CardLink>) {
    setCard(c => ({ ...c, links: c.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) }))
  }
  function dropLink(i: number) {
    setCard(c => ({ ...c, links: c.links.filter((_, j) => j !== i) }))
  }
  function moveLink(i: number, dir: -1 | 1) {
    setCard(c => {
      const j = i + dir
      if (j < 0 || j >= c.links.length) return c
      const links = [...c.links]
      ;[links[i], links[j]] = [links[j], links[i]]
      return { ...c, links }
    })
  }

  /* Publish, in three descending preferences:
   *   1. rewrite the row this session already holds the token for
   *   2. create a new row and hand back a short link plus an edit link
   *   3. storage unavailable - fall back to the fragment, which always works
   * Only (3) changes the user's outcome, and it says so rather than failing. */
  async function publish() {
    setPublishing(true)
    setLoadMsg('')
    const origin = window.location.origin
    try {
      if (editing) {
        const r = await fetch(`/api/cards/${editing.slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: editing.token, card }),
        })
        if (r.ok) {
          const u = `${origin}/s/${editing.slug}`
          setPub({ url: u, editUrl: editHref(origin, editing.slug, editing.token), stored: true, updated: true })
          qrDataUrl(u).then(setQr)
          return
        }
        /* The row is gone or the token is wrong. Do not silently create a
         * second card under a link the user thinks they are updating. */
        setLoadMsg('That card could not be updated — the link or token is no longer valid. Publishing below will create a new card.')
        setEditing(null)
      } else {
        const r = await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ card, pin: pinOk ? pin : undefined, slug: slug.trim() || undefined }),
        })
        /* A rejected link is not a storage failure, so it must not fall
         * through to the fragment fallback - that would hand back a link
         * they never asked for under a message saying it worked. */
        if (r.status === 409 || r.status === 400) {
          const { error } = await r.json().catch(() => ({ error: '' }))
          setLoadMsg(
            error === 'taken'
              ? `“${slug.trim()}” is already taken. Pick a different link and publish again.`
              : 'That link is not allowed. Use letters, numbers and dashes, 3 to 32 characters.',
          )
          setSlugState(error === 'taken' ? 'taken' : 'bad')
          return
        }
        if (r.ok) {
          const { slug, token } = await r.json()
          const u = `${origin}/s/${slug}`
          setEditing({ slug, token })
          rememberOwned(slug, token)
          setPub({ url: u, editUrl: editHref(origin, slug, token), stored: true })
          qrDataUrl(u).then(setQr)
          return
        }
      }
    } catch {
      /* network down, offline, blocked - same fallback */
    } finally {
      setPublishing(false)
    }

    const u = cardUrl(card, origin)
    setPub({ url: u, stored: false })
    qrDataUrl(u).then(setQr)
    setPublishing(false)
  }

  /* Permanent, and the confirm says so. There is no undo and no copy kept. */
  async function deleteCard() {
    if (!editing) return
    const ok = window.confirm(
      'Delete this card permanently?\n\n' +
      'The link stops working immediately for everyone you have given it to. ' +
      'This cannot be undone and the card cannot be recovered.'
    )
    if (!ok) return
    setPublishing(true)
    try {
      const r = await fetch(`/api/cards/${editing.slug}`, {
        method: 'DELETE',
        headers: { 'x-edit-token': editing.token },
      })
      if (r.ok) {
        setEditing(null); setPub(null); setQr(null)
        if (window.location.hash) history.replaceState(null, '', window.location.pathname)
        setLoadMsg('Card deleted. The old link no longer resolves.')
        return
      }
      setLoadMsg(r.status === 404
        ? 'That card is already gone, or the edit token no longer matches.'
        : 'Could not delete the card — storage did not respond.')
    } catch {
      setLoadMsg('Could not reach the server to delete the card.')
    } finally {
      setPublishing(false)
    }
  }

  /* Load a card back into the builder from any of its links. */
  async function loadFromLink() {
    const raw = loadInput.trim()
    if (!raw) return
    setLoadMsg('')

    const edit = /[#&]edit=([a-z0-9-]+):([a-f0-9]+)/i.exec(raw)
    if (edit) {
      const [, slug, token] = edit
      try {
        const r = await fetch(`/api/cards/${slug}`)
        if (!r.ok) throw new Error()
        const { card: c } = await r.json()
        if (!isCard(c)) throw new Error()
        setCard(c); setEditing({ slug, token }); rememberOwned(slug, token); setPub(null); setLoadInput('')
        setLoadMsg('Loaded. Publishing will update that same link.')
      } catch {
        setLoadMsg('Could not open that edit link.')
      }
      return
    }

    const frag = raw.indexOf('#')
    if (frag !== -1 && raw.includes('/c#')) {
      const c = decodeCard(raw.slice(frag + 1))
      if (!c) { setLoadMsg('That card link could not be read.'); return }
      setCard(c); setEditing(null); setPub(null); setLoadInput('')
      setLoadMsg('Loaded. This kind of link cannot be changed in place, so publishing makes a new link.')
      return
    }

    const stored = /\/s\/([a-z0-9-]+)/i.exec(raw)
    if (stored) {
      try {
        const r = await fetch(`/api/cards/${stored[1]}`)
        if (!r.ok) throw new Error()
        const { card: c } = await r.json()
        if (!isCard(c)) throw new Error()
        /* Do not quietly load a copy. A public link plus the card's PIN is
         * the same proof the card itself accepts, so ask for it here - this
         * is where people look, and most of them no longer have the edit
         * link they were handed at publish. */
        setPending({ slug: stored[1], name: c.name || 'that card' })
        setPendingPin('')
        setLoadMsg('')
      } catch {
        setLoadMsg('Could not find that card.')
      }
      return
    }

    setLoadMsg('That does not look like a ClearPath card link.')
  }

  /* The PIN route into editing the original. Identical proof to the card's
   * own unlock, and it mints a fresh token the same way. */
  async function unlockPending() {
    if (!pending) return
    if (!/^\d{4}$/.test(pendingPin)) { setLoadMsg('Four digits.'); return }
    setPendingBusy(true)
    setLoadMsg('')
    try {
      const r = await fetch(`/api/cards/${pending.slug}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pendingPin }),
      })
      if (r.ok) {
        const { token } = await r.json()
        const got = await fetch(`/api/cards/${pending.slug}`)
        const { card: c } = await got.json()
        if (!isCard(c)) throw new Error()
        setCard(c)
        setEditing({ slug: pending.slug, token })
        rememberOwned(pending.slug, token)
        setPending(null); setPendingPin(''); setLoadInput(''); setPub(null)
        setLoadMsg('Unlocked. Publishing now updates that same link — everyone already holding it sees the change.')
        return
      }
      const { error, retryInSeconds, triesLeft } = await r.json().catch(() => ({ error: 'failed' }))
      if (error === 'locked') {
        setLoadMsg(`Too many wrong tries. Try again in ${humanWait(retryInSeconds ?? 30)}.`)
      } else if (error === 'no_pin') {
        setLoadMsg('That card was published without a PIN, so it can only be edited from the browser that made it, or with its private edit link.')
      } else {
        setLoadMsg(
          `That PIN does not match${typeof triesLeft === 'number' ? ` — ${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left before a short lockout` : ''}.`,
        )
      }
    } catch {
      setLoadMsg('Could not reach the server.')
    } finally {
      setPendingBusy(false)
      setPendingPin('')
    }
  }

  async function copyPending() {
    if (!pending) return
    try {
      const r = await fetch(`/api/cards/${pending.slug}`)
      const { card: c } = await r.json()
      if (!isCard(c)) throw new Error()
      setCard(c); setEditing(null); setPub(null)
      setPending(null); setPendingPin(''); setLoadInput('')
      setLoadMsg('Loaded as a copy. Publishing this makes a NEW card at a new link — the original is untouched.')
    } catch {
      setLoadMsg('Could not load that card.')
    }
  }

  async function copy() {
    if (!pub) return
    try {
      await navigator.clipboard.writeText(pub.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* permission-gated */ }
  }

  function startOver() {
    setCard(EMPTY_CARD); setPub(null); setQr(null); setStep(0); setEditing(null); setLoadMsg(''); setPin('')
    setSlug(''); setSlugTouched(false); setSlugState('idle')
    setPending(null); setPendingPin('')
    if (window.location.hash) history.replaceState(null, '', window.location.pathname)
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* private mode */ }
  }

  return (
    <main style={{ padding: '30px 0 80px' }}>
      <div className="cc-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 12 }}>
          <Link href="/" className="cc-eyebrow" style={{ margin: 0 }}>← ClearPath Cards</Link>
          <button className="cc-ghost" style={{ flex: 'none', padding: '8px 14px' }} onClick={startOver} type="button">
            Start over
          </button>
        </div>

        <div className="cc-build">
          <div>
            <div className="cc-steps">
              {STEPS.map((s, i) => (
                <button key={s} className="cc-step" data-on={i === step} onClick={() => setStep(i)} type="button">
                  {i + 1}. {s}
                </button>
              ))}
            </div>

            {/* ---- 1. Identity ---- */}
            {step === 0 && (
              <div className="cc-panel">
                <h2 className="cc-h2">Who you are</h2>

                <div className="cc-field" style={{ paddingBottom: 16, borderBottom: '1px solid var(--cc-line)', marginBottom: 20 }}>
                  <label className="cc-label" htmlFor="f-load">Already have a card? Change it here</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input id="f-load" className="cc-input" value={loadInput}
                      onChange={e => setLoadInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); loadFromLink() } }}
                      placeholder="card.clearpathautomation.io/s/your-name" />
                    <button className="cc-btn-ghost" style={{ flex: 'none', padding: '11px 16px' }}
                      onClick={loadFromLink} type="button">Load</button>
                  </div>

                  {/* Said before anything happens, not after. The old version
                    * explained the copy/original distinction only once a card
                    * had already been loaded, which is one screen too late to
                    * be read as a warning. */}
                  {!pending && !editing && (
                    <p className="cc-hint">
                      Paste your card&apos;s own link and we will ask for its 4-digit PIN — that edits
                      the real card. Pasting anyone&apos;s link <strong>without</strong> the PIN only
                      loads a <strong>copy</strong>, and publishing a copy creates a brand-new card at
                      a new link. It never changes the original.
                    </p>
                  )}

                  {/* The PIN gate. This is the recovery path: the private edit
                    * link handed out at publish is no longer the only way in,
                    * which matters because almost nobody keeps it. */}
                  {pending && (
                    <div className="cc-unlock-box">
                      <p style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'var(--cc-text)' }}>
                        Found <strong>{pending.name}</strong> at <code>/s/{pending.slug}</code>.
                      </p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          className="cc-pin"
                          value={pendingPin}
                          onChange={e => setPendingPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); unlockPending() } }}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="••••"
                          aria-label="The card's 4-digit PIN"
                          autoFocus
                        />
                        <button className="cc-btn" style={{ padding: '10px 18px', fontSize: '0.88rem' }}
                          onClick={unlockPending} disabled={pendingBusy} type="button">
                          {pendingBusy ? 'Checking…' : 'Unlock and edit the real card'}
                        </button>
                        <button className="cc-btn-ghost" style={{ padding: '10px 16px', fontSize: '0.85rem' }}
                          onClick={copyPending} type="button">
                          No PIN — just load a copy
                        </button>
                      </div>
                      <p className="cc-hint" style={{ marginTop: 10 }}>
                        A copy is a separate card at a different link. The original stays exactly as it is.
                      </p>
                    </div>
                  )}

                  {loadMsg && <p className="cc-hint">{loadMsg}</p>}
                  {editing && (
                    <p className="cc-hint" style={{ color: 'var(--cc-accent-text)' }}>
                      Editing published card <strong>{editing.slug}</strong> — publishing updates it in place.
                    </p>
                  )}
                </div>

                <div className="cc-field">
                  <label className="cc-label" htmlFor="f-name">Name <span style={{ color: '#F43F5E' }}>*</span></label>
                  <input id="f-name" className="cc-input" value={card.name}
                    onChange={e => set('name', e.target.value)} placeholder="Damian Wroblewski" />
                </div>
                <div className="cc-field">
                  <label className="cc-label" htmlFor="f-cred">Credentials</label>
                  <input id="f-cred" className="cc-input" value={card.credentials ?? ''}
                    onChange={e => set('credentials', e.target.value)} placeholder="PharmD, MHA" />
                  <p className="cc-hint">Shown after your name. Leave blank if you do not use any.</p>
                </div>
                <div className="cc-field">
                  <label className="cc-label" htmlFor="f-title">Title</label>
                  <input id="f-title" className="cc-input" value={card.title ?? ''}
                    onChange={e => set('title', e.target.value)} placeholder="Founder & Principal Engineer" />
                </div>
                <div className="cc-field">
                  <label className="cc-label" htmlFor="f-org">Company</label>
                  <input id="f-org" className="cc-input" value={card.org ?? ''}
                    onChange={e => set('org', e.target.value)} placeholder="ClearPath Automation LLC" />
                </div>
                <div className="cc-field">
                  <label className="cc-label" htmlFor="f-tag">One line about what you do</label>
                  <textarea id="f-tag" className="cc-textarea" value={card.tagline ?? ''}
                    onChange={e => set('tagline', e.target.value)}
                    placeholder="Custom automation and AI agents, built by the engineer you talk to." />
                </div>
                <div className="cc-field">
                  <label className="cc-label" htmlFor="f-loc">Location</label>
                  <input id="f-loc" className="cc-input" value={card.location ?? ''}
                    onChange={e => set('location', e.target.value)} placeholder="Carpentersville, IL" />
                </div>
                <button className="cc-btn" onClick={() => setStep(1)} type="button">Next: photo →</button>
              </div>
            )}

            {/* ---- 2. Photo ---- */}
            {step === 1 && (
              <div className="cc-panel">
                <h2 className="cc-h2">Photo</h2>
                <p className="cc-note" style={{ marginBottom: 18 }}>
                  Optional. Your photo is shrunk to 320px and written into the card itself, so the
                  card never depends on an image server staying up. It also makes the link much
                  longer — long enough that it no longer fits in a QR code. Skip it if the QR
                  matters more than the face.
                </p>

                {card.photo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.photo} alt="Your card photo" width={78} height={78}
                      style={{ borderRadius: '50%', objectFit: 'cover' }} />
                    <button className="cc-ghost" style={{ flex: 'none', padding: '9px 15px' }}
                      onClick={() => set('photo', undefined)} type="button">Remove photo</button>
                  </div>
                )}

                <input className="cc-input" type="file" accept="image/*" onChange={onPhoto} disabled={busy} />
                {busy && <p className="cc-hint">Resizing…</p>}
                {photoErr && <div className="cc-warn" style={{ marginTop: 14 }}>{photoErr}</div>}

                <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                  <button className="cc-btn-ghost" onClick={() => setStep(0)} type="button">← Back</button>
                  <button className="cc-btn" onClick={() => setStep(2)} type="button">Next: links →</button>
                </div>
              </div>
            )}

            {/* ---- 3. Links ---- */}
            {step === 2 && (
              <div className="cc-panel">
                <h2 className="cc-h2">Links</h2>
                <p className="cc-note" style={{ marginBottom: 16 }}>
                  These become the tappable rows, and the ones that belong in a contact card —
                  email, phone, address — also travel into the saved contact.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                  {(Object.keys(LINK_META) as LinkKind[]).map(k => (
                    <button key={k} className="cc-ghost" style={{ flex: 'none', padding: '7px 12px', fontSize: '0.78rem' }}
                      onClick={() => addLink(k)} type="button">
                      + {LINK_META[k].label}
                    </button>
                  ))}
                </div>

                {card.links.length === 0 && <p className="cc-hint">No links yet — add one above.</p>}

                {card.links.map((l, i) => (
                  <div key={i} style={{ border: '1px solid var(--cc-line)', borderRadius: 11, padding: 13, marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <select className="cc-select" style={{ flex: '0 0 130px' }} value={l.kind}
                        onChange={e => {
                          const kind = e.target.value as LinkKind
                          editLink(i, { kind, label: LINK_META[kind].label })
                        }}>
                        {(Object.keys(LINK_META) as LinkKind[]).map(k => (
                          <option key={k} value={k}>{LINK_META[k].label}</option>
                        ))}
                      </select>
                      <input className="cc-input" value={l.label}
                        onChange={e => editLink(i, { label: e.target.value })} placeholder="Label" />
                    </div>
                    <input className="cc-input" value={l.value}
                      onChange={e => editLink(i, { value: e.target.value })}
                      placeholder={LINK_META[l.kind].placeholder} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button className="cc-ghost" style={{ flex: 'none', padding: '5px 11px', fontSize: '0.76rem' }}
                        onClick={() => moveLink(i, -1)} disabled={i === 0} type="button">↑</button>
                      <button className="cc-ghost" style={{ flex: 'none', padding: '5px 11px', fontSize: '0.76rem' }}
                        onClick={() => moveLink(i, 1)} disabled={i === card.links.length - 1} type="button">↓</button>
                      <button className="cc-ghost" style={{ flex: 'none', padding: '5px 11px', fontSize: '0.76rem' }}
                        onClick={() => dropLink(i)} type="button">Remove</button>
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                  <button className="cc-btn-ghost" onClick={() => setStep(1)} type="button">← Back</button>
                  <button className="cc-btn" onClick={() => setStep(3)} type="button">Next: publish →</button>
                </div>
              </div>
            )}

            {/* ---- 4. Publish ---- */}
            {step === 3 && (
              <div className="cc-panel">
                <h2 className="cc-h2">Colour & publish</h2>

                <div className="cc-field">
                  <span className="cc-label">Accent</span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ACCENTS.map(a => (
                      <button key={a.hex} onClick={() => set('accent', a.hex)} type="button"
                        title={a.name} aria-label={a.name}
                        style={{
                          width: 36, height: 36, borderRadius: 9, cursor: 'pointer', background: a.hex,
                          border: (card.accent || DEFAULT_ACCENT) === a.hex ? '2px solid #FAFAFA' : '1px solid var(--cc-line)',
                        }} />
                    ))}
                  </div>
                </div>

                {!editing && (
                  <div className="cc-field" style={{ marginTop: 22 }}>
                    <label className="cc-label" htmlFor="f-slug">Choose your link</label>
                    <div className="cc-slug">
                      <span className="cc-slug-pre">card.clearpathautomation.io/s/</span>
                      <input
                        id="f-slug"
                        className="cc-slug-input"
                        value={slug}
                        onChange={e => {
                          setSlugTouched(true)
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32))
                        }}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="your-name"
                      />
                    </div>
                    <p className="cc-hint" style={{ marginTop: 8 }}>
                      {slugState === 'checking' && 'Checking…'}
                      {slugState === 'free' && <span style={{ color: '#6EE7B7' }}>✓ That link is yours if you publish now.</span>}
                      {slugState === 'taken' && <span style={{ color: '#FDA4AF' }}>✗ Someone already has that one.</span>}
                      {slugState === 'bad' && <span style={{ color: '#FDA4AF' }}>✗ Letters, numbers and dashes only, 3 to 32 characters, not starting or ending with a dash.</span>}
                      {slugState === 'reserved' && <span style={{ color: '#FDA4AF' }}>✗ That one is reserved.</span>}
                      {slugState === 'unknown' && 'Could not check right now — publishing will tell you for certain.'}
                      {slugState === 'idle' && 'Leave this blank and you get a random link like /s/kqjtr62q. The link is permanent: it cannot be changed after you publish, because by then people have it.'}
                    </p>
                  </div>
                )}

                {!editing && (
                  <div className="cc-field">
                    <label className="cc-label" htmlFor="f-pin">Choose a 4-digit PIN</label>
                    <input
                      id="f-pin"
                      className="cc-input"
                      value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="0000"
                      style={{ maxWidth: 150, letterSpacing: '0.35em', fontSize: '1.1rem', textAlign: 'center' }}
                    />
                    <p className="cc-hint">
                      This is how you edit your card later from a phone that has never opened this
                      page — open the card and tap <strong>Is this your card?</strong> at the bottom.
                      Without it, editing works only in this browser. Pick something you will not
                      forget: nobody can look it up or reset it for you.
                    </p>
                  </div>
                )}

                {card.name.trim().length === 0 && (
                  <div className="cc-warn" style={{ marginBottom: 16 }}>Add your name on step 1 before publishing.</div>
                )}
                {card.name.trim().length > 0 && !ready && (
                  <div className="cc-warn" style={{ marginBottom: 16 }}>Enter four digits for your PIN before publishing.</div>
                )}

                {encodedLength > LONG_URL && (
                  <div className="cc-warn" style={{ marginBottom: 16 }}>
                    Packed into a single self-contained link this card would be{' '}
                    {encodedLength.toLocaleString()} characters, because the photo travels inside
                    it. That only bites if storage is unreachable when you publish — then you get
                    that long link instead of a short one, and no QR code can hold it. Published
                    normally you get the short link above and a QR that works. Removing the photo
                    makes the fallback usable too.
                  </div>
                )}

                <button className="cc-btn" onClick={publish} disabled={!ready || publishing} type="button"
                  style={!ready || publishing ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}>
                  {publishing ? 'Publishing…' : editing ? 'Update this card' : 'Publish card'}
                </button>

                {editing && !pub && (
                  <p className="cc-hint">
                    You are editing a published card. Updating rewrites it at its existing link —
                    everyone you have already given it to sees the change.
                  </p>
                )}

                {pub && (
                  <div style={{ marginTop: 22 }}>
                    <div className={pub.stored ? 'cc-ok' : 'cc-warn'} style={{ marginBottom: 14 }}>
                      {pub.stored
                        ? pub.updated
                          ? 'Updated. The link below is unchanged — anyone already holding it now sees the new version.'
                          : 'Published. Keep the edit link below: it is the only way to change this card later, and it is not recoverable.'
                        : 'Published without the database — storage was unreachable, so this is a self-contained link. It works permanently and needs nothing to stay up, but it cannot be edited later and it is long.'}
                    </div>
                    <label className="cc-label" htmlFor="f-url">Your card link</label>
                    <textarea id="f-url" className="cc-out" readOnly value={pub.url}
                      onFocus={e => e.currentTarget.select()} />
                    <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                      <button className="cc-btn" onClick={copy} type="button">{copied ? 'Copied ✓' : 'Copy link'}</button>
                      <a className="cc-btn-ghost" href={pub.url} target="_blank" rel="noopener noreferrer">Open card ↗</a>
                    </div>

                    {pub.stored && !pub.updated && pinOk && (
                      <div className="cc-ok" style={{ marginTop: 16 }}>
                        Your PIN is <strong>{pin}</strong>. Write it down. To edit from any phone,
                        open your card and tap <strong>Is this your card? Unlock editing</strong> at
                        the bottom. Five wrong tries locks the card for fifteen minutes.
                      </div>
                    )}

                    {pub.editUrl && (
                      <div style={{ marginTop: 18 }}>
                        <label className="cc-label" htmlFor="f-edit">Private edit link — save this</label>
                        <textarea id="f-edit" className="cc-out" readOnly value={pub.editUrl}
                          onFocus={e => e.currentTarget.select()} />
                        <p className="cc-hint">
                          Anyone with this link can rewrite your card, so do not share it. It is
                          stored as a one-way hash on our side, which means we cannot send it to
                          you again if you lose it. Note that unlocking with your PIN on another
                          phone issues a new key and retires this link.
                        </p>
                      </div>
                    )}
                    {qr && (
                      <div style={{ marginTop: 20 }}>
                        <span className="cc-label">QR code</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qr} alt="QR code for your card" width={180} height={180}
                          style={{ background: '#fff', padding: 10, borderRadius: 12, display: 'block' }} />
                        <a
                          className="cc-btn-ghost"
                          href={qr}
                          download={`${(card.name || 'card').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'card'}-qr.png`}
                          style={{ marginTop: 10, padding: '9px 16px', fontSize: '0.85rem' }}
                        >
                          Download QR (PNG)
                        </a>
                        <p className="cc-hint">540×540. Put it on a slide, a badge, or the back of a printed card.</p>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className="cc-btn-ghost" onClick={() => setStep(2)} type="button">← Back</button>
                  {editing && (
                    <button
                      className="cc-btn-ghost"
                      onClick={deleteCard}
                      disabled={publishing}
                      type="button"
                      style={{ borderColor: 'rgba(244,63,94,0.5)', color: '#FDA4AF', marginLeft: 'auto' }}
                    >
                      Delete this card
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ---- Live preview ---- */}
          <div className="cc-sticky">
            <p className="cc-label" style={{ textAlign: 'center' }}>Live preview</p>
            <CardView card={card.name ? card : { ...card, name: 'Your name' }} preview />
            <p className="cc-hint" style={{ textAlign: 'center', marginTop: 12 }}>
              Link length: {encodedLength.toLocaleString()} characters
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
