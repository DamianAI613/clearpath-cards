import { ImageResponse } from 'next/og'

/* Chrome will not consider a site installable unless the manifest declares a
 * 192px icon and a 512px one. This manifest offered a single 180x180 (the
 * iOS tile), so Chrome quietly refused to install it: no beforeinstallprompt,
 * no prompt, and an Add-to-Home-Screen button that did nothing. The failure
 * is silent by design, which is why it survived testing. */

export const runtime = 'nodejs'
export const dynamic = 'force-static'

export async function GET(req: Request) {
  const asked = Number(new URL(req.url).searchParams.get('size') ?? 512)
  const size = asked === 192 ? 192 : 512

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #4F46E5 0%, #2A24A8 100%)',
          color: '#fff',
          fontSize: Math.round(size * 0.42), fontWeight: 700,
          letterSpacing: Math.round(size * 0.012),
        }}
      >
        DW
      </div>
    ),
    { width: size, height: size },
  )
}
