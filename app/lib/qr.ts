/* QR generation, client-side only.
 *
 * A QR code tops out near 3kB of payload, and long before that it becomes a
 * dense mess no phone camera resolves across a table. A card with an inlined
 * photo blows past both limits, so this returns null rather than emitting an
 * unscannable code and calling it a feature. */

const MAX_SCANNABLE = 1200

export async function qrDataUrl(text: string, accent = '#09090B'): Promise<string | null> {
  if (text.length > MAX_SCANNABLE) return null
  try {
    const QR = (await import('qrcode')).default
    return await QR.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 540,
      color: { dark: accent, light: '#FFFFFF' },
    })
  } catch {
    return null
  }
}
