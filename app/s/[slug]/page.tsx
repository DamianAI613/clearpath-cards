import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { after } from 'next/server'
import { bumpViews, readCard } from '../../lib/db'
import HostedCard from '../../components/HostedCard'

/* A stored card, served from its own URL.
 *
 * This is what the database buys that the fragment cannot: the server can see
 * which card is being requested, so it can render real Open Graph tags and the
 * link unfurls properly in iMessage, Slack and LinkedIn. It is also why the
 * card can be edited in place - the link points at a row, not at the data. */

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const row = await readCard(slug)
    if (!row) return { title: 'Card not found' }
    const c = row.data
    const name = c.credentials ? `${c.name}, ${c.credentials}` : c.name
    const sub = [c.title, c.org].filter(Boolean).join(' · ')
    return {
      title: name,
      description: sub || c.tagline || `${name}'s card`,
      openGraph: {
        title: name,
        description: sub || c.tagline || '',
        url: `/s/${slug}`,
        type: 'profile',
      },
    }
  } catch {
    /* Metadata must never be the thing that takes the page down. */
    return { title: 'Card' }
  }
}

export default async function StoredCard({ params }: Props) {
  const { slug } = await params

  let row
  try {
    row = await readCard(slug)
  } catch {
    /* Storage is unreachable. Say so plainly rather than claiming the card
     * does not exist - the distinction matters to whoever handed it out. */
    return (
      <main className="cc-stage">
        <div className="cc-panel" style={{ maxWidth: 420, marginTop: 70, textAlign: 'center' }}>
          <h1 className="cc-h2">This card is temporarily unreachable</h1>
          <p className="cc-note" style={{ margin: 0 }}>
            The card exists — the storage behind it is not responding right now. Try again in a
            moment.
          </p>
        </div>
      </main>
    )
  }

  if (!row) notFound()

  after(() => bumpViews(slug))

  return (
    <main className="cc-stage">
      <HostedCard card={row.data} slug={slug} />
    </main>
  )
}
