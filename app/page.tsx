import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'A free digital business card',
}

const POINTS = [
  {
    h: 'A short link you can change later',
    b: 'Your card is stored, so you get a short link, a QR code and the ability to fix a phone number in ten seconds without reprinting anything. Everyone already holding the link sees the new version. No account: a 4-digit PIN you choose is what proves the card is yours.',
  },
  {
    h: 'And a copy that needs no server at all',
    b: 'If storage is ever unreachable when you publish, the whole card compresses into the link itself instead — longer, uneditable, and dependent on nothing. It is the same fallback your card falls back to rather than failing, and it says which kind of link you got.',
  },
  {
    h: 'A Save-to-contacts button that works',
    b: 'One tap writes a proper vCard — name, title, company, phone, email, address, photo — straight into their phone. Not a screenshot they will never type in.',
  },
  {
    h: 'A QR code for the room',
    b: 'Put it on a slide, a conference badge or the back of a paper card. They point a camera at it and your details are on their phone before the handshake ends.',
  },
  {
    h: 'Free, and it stays free',
    b: 'No account, no trial, no card on file. Every card carries a small "Build your own card" line at the bottom, which is how anyone hears about this. That is the entire business model.',
  },
]

export default function Home() {
  return (
    <main>
      <section style={{ position: 'relative', overflow: 'hidden', padding: '88px 0 54px' }}>
        <div className="cc-wrap">
          <p className="cc-eyebrow">ClearPath Cards</p>
          <h1 className="cc-h1">A business card<br />that cannot go out of date.</h1>
          <p className="cc-lede">
            Make a digital business card in about two minutes. You get one link, a QR code, and a
            button that drops you straight into their contacts. No account, no cost, and nothing
            behind it that can break.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="cc-btn" href="/new">Make my card — free</Link>
            <Link className="cc-btn-ghost" href="/s/damian">See a real one</Link>
            <Link className="cc-btn-ghost" href="/tutorials">Tutorial</Link>
          </div>
        </div>
      </section>

      <section style={{ padding: '26px 0 70px' }}>
        <div className="cc-wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 18 }}>
          {POINTS.map(p => (
            <div key={p.h} className="cc-panel">
              <h2 className="cc-h2" style={{ fontSize: '1.08rem' }}>{p.h}</h2>
              <p className="cc-note" style={{ margin: 0 }}>{p.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '0 0 80px' }}>
        <div className="cc-wrap">
          <div className="cc-panel" style={{ textAlign: 'center', padding: '40px 26px' }}>
            <h2 className="cc-h2">Built by ClearPath Automation</h2>
            <p className="cc-note" style={{ maxWidth: 560, margin: '0 auto 22px' }}>
              This tool is free because it is also a demonstration. ClearPath builds custom
              automation, AI agents and internal software for teams who have a manual process that
              should not need a person. If the card is useful, the rest probably is too.
            </p>
            <a className="cc-btn-ghost" href="https://clearpathautomation.io" target="_blank" rel="noopener noreferrer">
              clearpathautomation.io ↗
            </a>
          </div>
          <p className="cc-note" style={{ textAlign: 'center', marginTop: 26, maxWidth: 620, marginInline: 'auto' }}>
            A published card is stored so that its link can stay short and its contents can be
            corrected later. Everything on it is public to anyone holding the link — that is what a
            business card is. Nothing is stored about the people who open yours.{' '}
            <Link href="/privacy" style={{ color: 'var(--cc-accent-text)', fontWeight: 650 }}>
              What is kept, exactly →
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
