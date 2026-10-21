import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'ClearPath Cards — a free digital business card',
    template: '%s — ClearPath Cards',
  },
  description:
    'Make a digital business card in two minutes. One link, a real Save-to-contacts button, and a QR code. Free, no account, and the card lives in the link itself.',
  metadataBase: new URL('https://card.clearpathautomation.io'),
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'ClearPath Cards',
    description: 'A free digital business card. One link, no account.',
    url: 'https://card.clearpathautomation.io',
    siteName: 'ClearPath Cards',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#09090B',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
