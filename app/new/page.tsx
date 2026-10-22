'use client'

/* The builder. Four steps, a live preview, and a publish step that produces a
 * link with no row behind it. Draft state is mirrored to localStorage because
 * losing a half-finished card to an accidental refresh is unforgivable in a
 * tool whose entire pitch is "two minutes". */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  type Card, type CardLink, type LinkKind,
  DEFAULT_ACCENT, EMPTY_CARD, LINK_META, isCard,
} from '../lib/card'
import { cardUrl, decodeCard, encodeCard } from '../lib/codec'
import { downscale } from '../lib/photo'
import { qrDataUrl } from '../lib/qr'
import CardView from '../components/CardView'

type Published = { url: string; editUrl?: string; stored: boolean; updated?: boolean }

/* The edit token rides in the fragment, like the cards themselves, so that
 * handing someone a card link and handing someone edit rights stay visibly
 * different things. */
const editHref = (origin: string, slug: string, token: string) =>
  `${origin}/new#edit=${slug}:${token}`

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

  /* On mount: an edit link wins over a saved draft, then fall back to the
   * draft. The edit token travels in the fragment rather than the query
   * string so it never reaches the server in a page request - the only place
   * it is ever transmitted is the PATCH that uses it. */
  useEffect(() => {
    const m = /(?:^|[#&])edit=([a-z0-9]+):([a-f0-9]+)/i.exec(window.location.hash)
    if (m) {
      const [, slug, token] = m
      setLoadMsg('Loading your card…')
      fetch(`/api/cards/${slug}`)
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then(({ card: c }) => {
          if (!isCard(c)) throw new Error('bad card')
          setCard(c)
          setEditing({ slug, token })
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

  const encodedLength = useMemo(() => encodeCard(card).length, [card])
  const ready = card.name.trim().length > 0

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
          body: JSON.stringify(card),
        })
        if (r.ok) {
          const { slug, token } = await r.json()
          const u = `${origin}/s/${slug}`
          setEditing({ slug, token })
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

  /* Load a card back into the builder from any of its links. */
  async function loadFromLink() {
    const raw = loadInput.trim()
    if (!raw) return
    setLoadMsg('')

    const edit = /[#&]edit=([a-z0-9]+):([a-f0-9]+)/i.exec(raw)
    if (edit) {
      const [, slug, token] = edit
      try {
        const r = await fetch(`/api/cards/${slug}`)
        if (!r.ok) throw new Error()
        const { card: c } = await r.json()
        if (!isCard(c)) throw new Error()
        setCard(c); setEditing({ slug, token }); setPub(null); setLoadInput('')
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

    const stored = /\/s\/([a-z0-9]+)/i.exec(raw)
    if (stored) {
      try {
        const r = await fetch(`/api/cards/${stored[1]}`)
        if (!r.ok) throw new Error()
        const { card: c } = await r.json()
        if (!isCard(c)) throw new Error()
        setCard(c); setEditing(null); setPub(null); setLoadInput('')
        setLoadMsg('Loaded a copy. Without the edit link you cannot change the original, so publishing makes a new card.')
      } catch {
        setLoadMsg('Could not find that card.')
      }
      return
    }

    setLoadMsg('That does not look like a ClearPath card link.')
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
    setCard(EMPTY_CARD); setPub(null); setQr(null); setStep(0); setEditing(null); setLoadMsg('')
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
                  <label className="cc-label" htmlFor="f-load">Already have a card? Paste its link</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input id="f-load" className="cc-input" value={loadInput}
                      onChange={e => setLoadInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); loadFromLink() } }}
                      placeholder="card.clearpathautomation.io/s/… or your edit link" />
                    <button className="cc-btn-ghost" style={{ flex: 'none', padding: '11px 16px' }}
                      onClick={loadFromLink} type="button">Load</button>
                  </div>
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

                {!ready && <div className="cc-warn" style={{ marginBottom: 16 }}>Add your name on step 1 before publishing.</div>}

                {encodedLength > LONG_URL && (
                  <div className="cc-warn" style={{ marginBottom: 16 }}>
                    This card is {encodedLength.toLocaleString()} characters long because the photo
                    travels inside the link. It will still work everywhere a link works, but it is
                    too long for a QR code and some chat apps will visibly wrap it. Removing the
                    photo fixes both.
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

                    {pub.editUrl && (
                      <div style={{ marginTop: 18 }}>
                        <label className="cc-label" htmlFor="f-edit">Private edit link — save this</label>
                        <textarea id="f-edit" className="cc-out" readOnly value={pub.editUrl}
                          onFocus={e => e.currentTarget.select()} />
                        <p className="cc-hint">
                          Anyone with this link can rewrite your card, so do not share it. It is
                          stored as a one-way hash on our side, which means we cannot send it to
                          you again if you lose it.
                        </p>
                      </div>
                    )}
                    {qr && (
                      <div style={{ marginTop: 20 }}>
                        <span className="cc-label">QR code</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qr} alt="QR code for your card" width={180} height={180}
                          style={{ background: '#fff', padding: 10, borderRadius: 12, display: 'block' }} />
                        <p className="cc-hint">Right-click to save. Put it on a slide, a badge, or a printed card.</p>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 22 }}>
                  <button className="cc-btn-ghost" onClick={() => setStep(2)} type="button">← Back</button>
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
