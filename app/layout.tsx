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

/* beforeinstallprompt fires as soon as Chrome decides the page is
 * installable, which is routinely before React has hydrated and attached a
 * listener. The event is not replayed, so a page that misses it has no way
 * to ever offer an install button. This catches it in the document head,
 * before anything else runs, and parks it on window for the card's owner
 * strip to pick up whenever it mounts. */
const CATCH_INSTALL_PROMPT = `
window.__cpInstallPrompt = null;
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  window.__cpInstallPrompt = e;
  window.dispatchEvent(new Event('cp:installable'));
});
window.addEventListener('appinstalled', function () {
  window.__cpInstallPrompt = null;
});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: CATCH_INSTALL_PROMPT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
