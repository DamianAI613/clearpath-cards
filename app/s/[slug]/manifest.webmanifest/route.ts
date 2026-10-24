/* A manifest per card, which is the whole trick behind "it opens like an app".
 *
 * The root manifest cannot do this job: its start_url is the landing page, so
 * an icon installed from a card would open the marketing site. Scoping a
 * manifest to /s/<slug> and starting it at that card's QR is what makes the
 * installed icon behave like the owner's own app. */

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
    short_name: name.split(/\s+/)[0].slice(0, 12) || 'Card',
    description: 'Your digital business card, one tap from the home screen.',
    start_url: `/s/${slug}/qr`,
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
