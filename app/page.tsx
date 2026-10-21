import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'A free digital business card',
}

const POINTS = [
  {
    h: 'The card lives in the link',
    b: 'Not in a database you have to trust. The whole card is compressed into the link itself, which means there is no account to lose, no row to delete and no subscription that turns your card into a 404 the month you stop paying.',
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
    b: 'No account, no trial, no card on file. Free cards carry a small "Built with ClearPath Cards" line at the bottom. That is the entire business model.',
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
            <Link className="cc-btn-ghost" href="/damian">See a real one</Link>
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
          <p className="cc-note" style={{ textAlign: 'center', marginTop: 26 }}>
            Your card never reaches a server. The part of a link after the <code>#</code> is the one
            part a browser does not transmit, and that is where your card is kept.
          </p>
        </div>
      </section>
    </main>
  )
}
