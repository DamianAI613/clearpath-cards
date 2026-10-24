'use client'

/* "I made this card, but not on this phone."
 *
 * Proof of ownership normally lives in localStorage, which does not survive a
 * new device or a cleared browser. The PIN chosen when the card was made is
 * the way back in. A correct one mints a new edit token and retires the old,
 * so this also revokes the device that was lost - which is usually why
 * someone is standing here in the first place. */

import { useState } from 'react'
import { rememberOwned } from '../lib/owned'

/* The first lockout is thirty seconds, so "1 minute" would be a lie in the
 * direction that matters - someone standing in front of a prospect needs to
 * know it is seconds, not minutes. */
function humanWait(seconds: number): string {
  if (seconds < 90) return `${Math.max(5, Math.round(seconds / 5) * 5)} seconds`
  const mins = Math.ceil(seconds / 60)
  if (mins < 90) return `${mins} minute${mins === 1 ? '' : 's'}`
  const hours = Math.ceil(mins / 60)
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

export default function UnlockEdit({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{4}$/.test(pin)) { setMsg('Four digits.'); return }
    setBusy(true)
    setMsg('')
    try {
      const r = await fetch(`/api/cards/${slug}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (r.ok) {
        const { token } = await r.json()
        rememberOwned(slug, token)
        /* Reload rather than flipping state: ownership changes what the
         * server-rendered page should have said, so re-ask it. */
        window.location.reload()
        return
      }
      const { error, retryInSeconds, triesLeft } = await r.json().catch(() => ({ error: 'failed' }))
      if (error === 'locked') {
        setMsg(`Too many tries. Try again in ${humanWait(retryInSeconds ?? 30)}.`)
      } else if (error === 'no_pin') {
        setMsg('This card has no PIN, so it can only be edited from the browser that made it.')
      } else {
        setMsg(
          `That PIN does not match${typeof triesLeft === 'number' ? ` — ${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left` : ''}.`,
        )
      }
    } catch {
      setMsg('Could not reach the server.')
    } finally {
      setBusy(false)
      setPin('')
    }
  }

  if (!open) {
    return (
      <button className="cc-unlock" type="button" onClick={() => setOpen(true)}>
        Is this your card? Unlock editing
      </button>
    )
  }

  return (
    <form className="cc-unlock-form" onSubmit={submit}>
      <input
        className="cc-pin"
        value={pin}
        onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="••••"
        aria-label="Your 4-digit card PIN"
        autoFocus
      />
      <button className="cc-chip" type="submit" disabled={busy}>
        {busy ? 'Checking…' : 'Unlock'}
      </button>
      {msg && <p className="cc-unlock-msg">{msg}</p>}
    </form>
  )
}
