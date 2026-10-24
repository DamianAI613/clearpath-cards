import type { Metadata } from 'next'
import { adminConfigured, isAdmin } from '../lib/admin'
import { db, stats, type CardStat } from '../lib/db'
import DeleteCard from './DeleteCard'

/* Is anyone actually using this?
 *
 * Four numbers and a table, behind one password. Deliberately not an
 * analytics product: no sessions, no funnels, no charts of things nobody
 * will act on. The question this page answers is whether to keep going. */

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'ClearPath Cards — usage',
  robots: { index: false, follow: false },
}

function when(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Stat({ k, v, d }: { k: string; v: string | number; d: string }) {
  return (
    <div className="cc-panel" style={{ padding: '16px 18px 14px' }}>
      <div style={{ fontSize: '0.66rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--cc-dim)', fontWeight: 700 }}>
        {k}
      </div>
      <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--cc-head)', letterSpacing: '-0.02em', margin: '7px 0 2px', fontVariantNumeric: 'tabular-nums' }}>
        {typeof v === 'number' ? v.toLocaleString() : v}
      </div>
      <div style={{ fontSize: '0.76rem', color: 'var(--cc-faint)' }}>{d}</div>
    </div>
  )
}

function Gate({ failed }: { failed: boolean }) {
  return (
    <main className="cc-stage" style={{ justifyContent: 'center' }}>
      <div className="cc-panel" style={{ maxWidth: 380, width: '100%' }}>
        <h1 className="cc-h2">Usage</h1>
        {!adminConfigured() ? (
          <p className="cc-note" style={{ margin: 0 }}>
            No admin password is set on this deployment, so this page cannot be opened. Add an{' '}
            <code>ADMIN_PASSWORD</code> environment variable in Vercel and redeploy.
          </p>
        ) : (
          <form method="POST" action="/admin/login">
            {failed && <div className="cc-warn" style={{ marginBottom: 14 }}>Wrong password.</div>}
            <label className="cc-label" htmlFor="password">Password</label>
            <input
              className="cc-input"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
            />
            <button className="cc-btn" type="submit" style={{ marginTop: 14 }}>Open</button>
          </form>
        )}
      </div>
    </main>
  )
}

function Row({ r }: { r: CardStat }) {
  const td: React.CSSProperties = { padding: '11px 12px', borderBottom: '1px solid var(--cc-soft2)', color: 'var(--cc-muted)' }
  const num: React.CSSProperties = { ...td, fontVariantNumeric: 'tabular-nums', color: 'var(--cc-text)', textAlign: 'right' }
  return (
    <tr>
      <td style={{ ...td, color: 'var(--cc-text)', fontWeight: 600 }}>
        <a href={`/s/${r.slug}`} target="_blank" rel="noopener noreferrer">{r.name}</a>
        <div style={{ fontSize: '0.72rem', color: 'var(--cc-faint)', fontWeight: 400 }}>
          /s/{r.slug}{r.has_pin ? '' : ' · no PIN'}
        </div>
      </td>
      <td style={td}>{when(r.created_at)}</td>
      <td style={{ ...td, color: r.phone ? 'var(--cc-text)' : 'var(--cc-faint)' }}>{r.phone ?? '— not given —'}</td>
      <td style={num}>{r.views.toLocaleString()}</td>
      <td style={num}>{r.saves.toLocaleString()}</td>
      <td style={num}>{r.shares.toLocaleString()}</td>
      <td style={num}>{r.qrs.toLocaleString()}</td>
      <td style={num}>{r.ctas.toLocaleString()}</td>
      <td style={num}>{r.outs.toLocaleString()}</td>
      <td style={td}>{r.edits > 0 ? when(r.updated_at) : '—'}</td>
      <td style={{ ...td, textAlign: 'right' }}><DeleteCard slug={r.slug} name={r.name} /></td>
    </tr>
  )
}

export default async function Admin({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams
  if (!(await isAdmin())) return <Gate failed={e === '1'} />

  if (!db()) {
    return (
      <main className="cc-stage" style={{ justifyContent: 'center' }}>
        <div className="cc-panel" style={{ maxWidth: 420 }}>
          <h1 className="cc-h2">No storage</h1>
          <p className="cc-note" style={{ margin: 0 }}>
            There is no <code>DATABASE_URL</code> on this deployment, so there is nothing to count.
          </p>
        </div>
      </main>
    )
  }

  let s
  try {
    s = await stats()
  } catch {
    s = null
  }

  if (!s) {
    return (
      <main className="cc-stage" style={{ justifyContent: 'center' }}>
        <div className="cc-panel" style={{ maxWidth: 420 }}>
          <h1 className="cc-h2">Storage is not answering</h1>
          <p className="cc-note" style={{ margin: 0 }}>The database did not respond. Try again in a moment.</p>
        </div>
      </main>
    )
  }

  const th: React.CSSProperties = {
    textAlign: 'left', fontSize: '0.66rem', letterSpacing: '0.09em', textTransform: 'uppercase',
    color: 'var(--cc-dim)', fontWeight: 700, padding: '0 12px 9px', borderBottom: '1px solid var(--cc-line)',
  }
  const thr: React.CSSProperties = { ...th, textAlign: 'right' }

  return (
    <main style={{ padding: '34px 0 80px' }}>
      <div className="cc-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <p className="cc-eyebrow">ClearPath Cards</p>
            <h1 className="cc-h2" style={{ margin: 0 }}>Usage</h1>
          </div>
          <form method="POST" action="/admin/login">
            <input type="hidden" name="logout" value="1" />
            <button className="cc-btn-ghost" type="submit" style={{ padding: '8px 14px', fontSize: '0.84rem' }}>Sign out</button>
          </form>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))', gap: 14, marginBottom: 20 }}>
          <Stat k="Cards created" v={s.cards} d={`+${s.cardsLast7} in the last 7 days`} />
          <Stat k="Cards edited" v={s.edited} d={s.cards ? `${Math.round((s.edited / s.cards) * 100)}% came back` : 'none yet'} />
          <Stat k="Card views" v={s.views} d="all cards, all time" />
          <Stat k="Contacts saved" v={s.saves} d="the tap that matters" />
          <Stat k="Cards shared" v={s.shares} d="owners handing theirs out" />
          <Stat k="Build-your-own taps" v={s.ctas} d={s.views ? `${((s.ctas / s.views) * 100).toFixed(1)}% of views` : 'the growth loop'} />
          <Stat k="To clearpathautomation.io" v={s.outs} d={s.views ? `${((s.outs / s.views) * 100).toFixed(1)}% of views` : 'the business end'} />
        </div>

        <div className="cc-panel" style={{ padding: '18px 10px 6px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: 900 }}>
            <thead>
              <tr>
                <th style={th}>Card</th>
                <th style={th}>Created</th>
                <th style={th}>Owner phone</th>
                <th style={thr}>Views</th>
                <th style={thr}>Saves</th>
                <th style={thr}>Shares</th>
                <th style={thr}>QR</th>
                <th style={thr}>Build</th>
                <th style={thr}>ClearPath</th>
                <th style={th}>Last edit</th>
                <th style={{ ...th, textAlign: 'right' }}>&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.length === 0 && (
                <tr><td colSpan={11} style={{ padding: '18px 12px', color: 'var(--cc-dim)' }}>No cards yet.</td></tr>
              )}
              {s.rows.map(r => <Row key={r.slug} r={r} />)}
            </tbody>
          </table>
        </div>

        <p className="cc-hint" style={{ marginTop: 18, maxWidth: 680 }}>
          <strong>Build</strong> is taps on &ldquo;Build your own card&rdquo;; <strong>ClearPath</strong>
          is visitors leaving for clearpathautomation.io. Both are counted on cards handed out through
          a short link; a card shared as a long self-contained link has no row to attribute them to, so
          those taps reach the totals above but not this table.
          {' '}Owner phone is the number the card&apos;s own creator put on their card — it is already
          public on that card. Nothing here identifies a <em>visitor</em>: no browser can hand a
          page someone&apos;s phone number, and nothing is logged about who viewed what. Counts come
          from an unauthenticated endpoint, so treat them as a usage signal, not an audited figure.
        </p>
      </div>
    </main>
  )
}
