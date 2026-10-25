import type { Metadata } from 'next'
import Link from 'next/link'
import CardDiagram from './CardDiagram'
import { AndroidSteps, IphoneSteps } from './PhoneSteps'

/* Three questions, answered in the order people hit them: what am I looking
 * at, how do I get one, and how do I stop having to find it again. */

export const metadata: Metadata = {
  title: 'How it works',
  description: 'What every button on a ClearPath card does, how to make one, and how to keep it one tap away.',
}

const BUTTONS: { n: number; h: string; b: string }[] = [
  { n: 1, h: 'The QR, top right',
    b: 'Press it and it fills the card, large enough for someone to scan from across a table. It is too small to scan at rest, which is why it says PRESS ME rather than SCAN ME.' },
  { n: 2, h: 'Save to contacts',
    b: 'The one that matters. One tap writes a real contact card into their phone — name, title, company, phone, email, address and photo. Not a screenshot they will never type in.' },
  { n: 3, h: 'Share this info',
    b: 'Opens a short menu: a text message with the link already written, an email, your phone’s own share sheet for AirDrop and Messenger, Copy link, and on Android, writing the link to a blank NFC tag.' },
  { n: 4, h: 'Your phone number',
    b: 'Tappable — it dials. Whichever number you put first is the one shown without expanding anything, because it is the thing people ask for out loud.' },
  { n: 5, h: 'Email, Website and more',
    b: 'Everything secondary folds in here so the top of the card stays short enough to read at a glance. Tap to open it; nothing is hidden from anyone.' },
  { n: 6, h: 'YOURS — only you see this',
    b: 'Edit card, Show QR and Add to Home Screen appear only on a phone that has proved the card is yours. A stranger holding your card never sees them.' },
  { n: 7, h: 'Build your own card',
    b: 'What a visitor sees instead of your controls. Every card you hand out quietly offers the next person one of their own, which is the only advertising this thing has.' },
  { n: 8, h: 'Is this your card? Unlock editing',
    b: 'For when you are on a phone that has never opened your card. Your 4-digit PIN unlocks it and hands this phone the keys.' },
]

const MAKE = [
  { h: 'Who you are', b: 'Name is the only required field. Credentials, title, company, a one-line description and a location are all optional and all look better filled in.' },
  { h: 'A photo, if you want one', b: 'Optional. It is shrunk and stored inside the card itself, so it loads instantly and depends on no image host.' },
  { h: 'Links', b: 'Phone, email, website and address first, then socials. The order you put them in is the order they appear; the first phone number is the one shown up front.' },
  { h: 'Choose your link and a PIN', b: 'Pick the address people will see — your name, usually. Then four digits. Write them down: the PIN is how you edit this card from any phone later, and nobody can look it up or reset it for you.' },
]

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="cc-h2" style={{ fontSize: '1.3rem', margin: '0 0 6px' }}>{children}</h2>
}

export default function Tutorials() {
  return (
    <main style={{ padding: '34px 0 90px' }}>
      <div className="cc-wrap" style={{ maxWidth: 760 }}>
        <Link href="/" className="cc-eyebrow" style={{ display: 'inline-block', marginBottom: 18 }}>
          ← ClearPath Cards
        </Link>
        <h1 className="cc-h1" style={{ fontSize: '2.1rem', marginBottom: 10 }}>How it works</h1>
        <p className="cc-lede" style={{ marginBottom: 14 }}>
          Three things: what every button does, how to make a card, and how to stop having to look
          for it.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 46 }}>
          <Link className="cc-btn" href="/new">Make my card — free</Link>
          <Link className="cc-btn-ghost" href="/s/damian">See a real one</Link>
        </div>

        {/* ---- 1 ---- */}
        <section style={{ marginBottom: 52 }}>
          <p className="cc-eyebrow">One</p>
          <H>What every button does</H>
          <p className="cc-note" style={{ margin: '0 0 24px' }}>
            The numbers on the drawing match the list underneath it.
          </p>
          <div className="cc-tut-split">
            <div className="cc-panel" style={{ padding: 16 }}>
              <CardDiagram />
            </div>
            <ol className="cc-tut-list">
              {BUTTONS.map(b => (
                <li key={b.n}>
                  <span className="cc-tut-n">{b.n}</span>
                  <div>
                    <strong>{b.h}</strong>
                    <p className="cc-note" style={{ margin: '3px 0 0' }}>{b.b}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---- 2 ---- */}
        <section style={{ marginBottom: 52 }}>
          <p className="cc-eyebrow">Two</p>
          <H>Making your own</H>
          <p className="cc-note" style={{ margin: '0 0 22px' }}>
            Four steps, about two minutes, no account and no email address.
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            {MAKE.map((m, i) => (
              <div key={m.h} className="cc-panel" style={{ display: 'flex', gap: 14, padding: '16px 18px' }}>
                <span className="cc-tut-n" style={{ flex: 'none' }}>{i + 1}</span>
                <div>
                  <strong style={{ color: 'var(--cc-head)' }}>{m.h}</strong>
                  <p className="cc-note" style={{ margin: '4px 0 0' }}>{m.b}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="cc-note" style={{ marginTop: 16 }}>
            Publishing gives you a short link and a QR code. Changing anything later keeps the same
            link — everyone you have already given it to sees the new version.
          </p>
        </section>

        {/* ---- 3 ---- */}
        <section style={{ marginBottom: 40 }}>
          <p className="cc-eyebrow">Three</p>
          <H>Keeping it one tap away</H>
          <p className="cc-note" style={{ margin: '0 0 8px' }}>
            Put the card on your home screen and it opens like an app — no browser bar, no typing,
            and it works with no signal. The two phones do this differently.
          </p>

          <h3 className="cc-h2" style={{ fontSize: '1rem', margin: '28px 0 12px' }}>iPhone</h3>
          <IphoneSteps />

          <h3 className="cc-h2" style={{ fontSize: '1rem', margin: '34px 0 12px' }}>Android</h3>
          <AndroidSteps />

          <p className="cc-note" style={{ marginTop: 22 }}>
            It saves as <strong>My Card</strong> on both, whoever you are — the icon carries your
            initials, so a predictable name is what makes it findable by search. Neither phone lets
            a web page choose where the icon lands, which is why the last step on each is about
            finding it.
          </p>
        </section>

        <div className="cc-panel" style={{ textAlign: 'center', padding: '26px 22px' }}>
          <p className="cc-note" style={{ margin: '0 0 16px' }}>
            Still stuck, or something behaved differently from this page?
          </p>
          <a className="cc-btn-ghost" href="mailto:info@clearpathautomation.io">
            info@clearpathautomation.io
          </a>
        </div>
      </div>
    </main>
  )
}
