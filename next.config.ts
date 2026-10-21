import type { NextConfig } from 'next'

/* No database, no env vars, no image optimization service.
 * A card must keep working with nothing configured. */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
}

export default nextConfig
