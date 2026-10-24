/* A manifest per card, which is the whole trick behind "it opens like an app".
 *
 * The root manifest cannot do this job: its start_url is the landing page, so
 * an icon installed from a card would open the marketing site. Scoping a
 * manifest to /s/<slug> and starting it there is what makes the installed
 * icon behave like the owner's own app - it opens their card, with its own
 * QR in the corner for the times they are being scanned. */

import { readCard } from '../../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params

  let name = 'My card'
  try {
    const row = await readCard(slug)
    if (row?.data.name?.trim()) name = row.data.name.trim()
  } catch { /* an unreachable database still gets a usable manifest */ }

  const manifest = {
    name: `${name} — card`,
    /* Every card installs under the same home-screen name on purpose. The
     * icon already carries the owner's initials, and a predictable label is
     * what makes "search your phone for My Card" a true instruction for
     * everyone rather than one that only works for some people. */
    short_name: 'My Card',
    description: 'Your digital business card, one tap from the home screen.',
    start_url: `/s/${slug}`,
    scope: `/s/${slug}`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFFFFF',
    theme_color: '#09090B',
    icons: [
      { src: `/s/${slug}/app-icon?size=192`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `/s/${slug}/app-icon?size=512`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `/s/${slug}/app-icon?size=512`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }

  return new Response(JSON.stringify(manifest), {
    headers: {
      'content-type': 'application/manifest+json',
      'cache-control': 'public, max-age=300',
    },
  })
}
