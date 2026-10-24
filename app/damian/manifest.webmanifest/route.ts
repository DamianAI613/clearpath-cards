/* A manifest of its own, so Add-to-Home-Screen installs the card rather than
 * the landing page. The root manifest's start_url is "/", and an installed
 * icon that opens the marketing site instead of the card would be exactly
 * the wrong result.
 *
 * start_url is the card itself. It pointed at the QR for a while, on the
 * theory that the reason to install it is to be scanned - but opening to a
 * black-and-white square and no card is disorienting, and the card's own
 * corner QR is one tap from the same thing. Open to the card; keep the QR
 * one tap away. */

export const dynamic = 'force-static'

export function GET() {
  return Response.json(
    {
      name: 'Damian Wroblewski — card',
      short_name: 'My Card',
      description: 'Digital business card',
      start_url: '/damian',
      scope: '/damian',
      display: 'standalone',
      background_color: '#FFFFFF',
      theme_color: '#4F46E5',
      icons: [{ src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' }],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  )
}
