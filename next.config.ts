import type { NextConfig } from 'next'

/* No database, no env vars, no image optimization service.
 * A card must keep working with nothing configured. */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },

  /* /damian was a hand-built route from before the database existed: a card
   * defined in source, which meant changing a phone number took a deploy and
   * nothing about it was counted. The same card now lives in a row at
   * /s/damian, where it can be edited from a phone with a PIN like everyone
   * else's.
   *
   * Two cards claiming to be the same person is the worst of both, so the old
   * path redirects permanently. Everything already printed, scanned into a
   * phone, or sitting in an email signature keeps resolving - it just arrives
   * at the card that is actually maintained. The :path* rule carries the QR
   * page, the manifest and the icons along with it, so an installed app that
   * still points at the old start_url finds something. */
  async redirects() {
    return [
      { source: '/damian', destination: '/s/damian', permanent: true },
      { source: '/damian/:path*', destination: '/s/damian/:path*', permanent: true },
    ]
  },
}

export default nextConfig
