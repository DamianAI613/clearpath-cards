import type { Metadata } from 'next'
import Link from 'next/link'

/* Short on purpose. A privacy page nobody reads protects nobody, and this
 * product is handed to strangers by people who are vouching for it. */

export const metadata: Metadata = {
  title: 'What this stores',
  description: 'Exactly what ClearPath Cards keeps, what it does not, and how to delete it.',
}

function S({ h, children }: { h: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 className="cc-h2" style={{ fontSize: '1.08rem', marginBottom: 8 }}>{h}</h2>
      <div className="cc-note" style={{ margin: 0 }}>{children}</div>
    </section>
  )
}

export default function Privacy() {
  return (
    <main style={{ padding: '34px 0 80px' }}>
      <div className="cc-wrap" style={{ maxWidth: 680 }}>
        <Link href="/" className="cc-eyebrow" style={{ display: 'inline-block', marginBottom: 18 }}>
          ← ClearPath Cards
        </Link>
        <h1 className="cc-h1" style={{ fontSize: '2rem', marginBottom: 10 }}>What this stores</h1>
        <p className="cc-lede" style={{ marginBottom: 32 }}>
          In plain terms, because you are about to put your phone number on the internet and hand
          the link to strangers.
        </p>

        <S h="Your card is public">
          Anyone who has the link can read everything on your card. There is no password on the card
          itself and there is not meant to be — it is a business card. Put on it only what you would
          hand to someone you just met. If you would not print it, do not publish it.
        </S>

        <S h="What is kept">
          The card you published: name, credentials, title, company, the one-line description,
          location, and every link you added, including your phone number and email. If you added a
          photo it is resized and stored inside the card itself. Alongside it: the date you created
          it, the date you last changed it, how many times it has been edited, and two one-way
          hashes — one of your PIN, one of your edit token. Hashes cannot be turned back into what
          you typed, which also means nobody here can tell you your PIN if you forget it.
        </S>

        <S h="What is counted">
          Per card: views, taps on Save to contacts, taps on Share, times the QR was opened, and
          taps on the two ClearPath links in the footer. A row says that a thing happened to a card
          at a time. It records nothing about who did it — no IP address, no browser fingerprint, no
          cookie, no account, no third-party analytics of any kind. There is no way, from this data,
          to know who looked at your card.
        </S>

        <S h="What is never collected">
          No signup, no email address, no password. No advertising or tracking scripts. Nothing is
          sold or shared with anyone. A web page cannot read a visitor&apos;s phone number and this
          one does not try.
        </S>

        <S h="Who can see it">
          Anyone with the link, which is the point. Plus ClearPath Automation, which runs the
          service: the operator can see the list of published cards with their public contents and
          counters, and can delete a card — that exists so an abusive or impersonating card can be
          taken down, and it is the only moderation there is.
        </S>

        <S h="Deleting it">
          Open your card, unlock editing with your PIN, and use Delete. The row and all of its
          counters are removed immediately and the link stops working for everyone, including anyone
          who saved it. There is no undo and no copy kept. A card published as a long self-contained
          link cannot be deleted, because there is nothing to delete — the card is inside the link
          itself, and it stops existing when people stop having the link.
        </S>

        <S h="On other people&rsquo;s phones">
          A phone that has opened your card keeps a copy so it still works without a signal. That
          copy lives on their device, not here, and is replaced the next time they open the card
          with a connection. Deleting your card does not reach into a phone that already has it —
          the same as a paper card you have already handed out.
        </S>

        <S h="Where it lives">
          Hosted on Vercel; the database is Neon Postgres. Both run in the United States. Everything
          travels over HTTPS.
        </S>

        <S h="The honest limits">
          This is a free tool with no account system. A 4-digit PIN protects editing, rate-limited
          against guessing, which is proportionate to a business card and would not be proportionate
          to anything else. It is offered as-is, with no guarantee of uptime or of permanence. If it
          mattered enough to need a guarantee, it should not be free.
        </S>

        <S h="Questions, or take my card down">
          <a href="mailto:info@clearpathautomation.io" style={{ color: 'var(--cc-accent-text)', fontWeight: 650 }}>
            info@clearpathautomation.io
          </a>
        </S>

        <p className="cc-note" style={{ marginTop: 34, fontSize: '0.82rem', color: 'var(--cc-faint)' }}>
          Last updated 24 October 2026. If this page ever disagrees with what the product does, the
          page is the bug — say so and it gets fixed.
        </p>
      </div>
    </main>
  )
}
