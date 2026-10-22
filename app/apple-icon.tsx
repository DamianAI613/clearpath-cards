import { ImageResponse } from 'next/og'

/* iOS uses this for the Add-to-Home-Screen tile. Without it the home screen
 * shows a cropped screenshot of the page, which looks accidental on the one
 * surface where this app is meant to look deliberate. */

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #4F46E5 0%, #2A24A8 100%)',
          color: '#fff',
          fontSize: 76,
          fontWeight: 700,
          letterSpacing: 2,
        }}
      >
        DW
      </div>
    ),
    size
  )
}
