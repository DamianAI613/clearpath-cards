/* A manifest of its own, so Add-to-Home-Screen installs the card rather than
 * the landing page. The root manifest's start_url is "/", and an installed
 * icon that opens the marketing site instead of the card would be exactly
 * the wrong result.
 *
 * start_url points at /damian/qr deliberately: the reason to put this on a
 * home screen is to show someone a QR within a couple of seconds. */

export const dynamic = 'force-static'

export function GET() {
  return Response.json(
    {
      name: 'Damian Wroblewski — card',
      short_name: 'My Card',
      description: 'Digital business card',
      start_url: '/damian/qr',
      scope: '/damian',
      display: 'standalone',
      background_color: '#FFFFFF',
      theme_color: '#4F46E5',
      icons: [{ src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' }],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  )
}
