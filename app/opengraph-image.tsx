import { ImageResponse } from 'next/og'

/* The picture Facebook, LinkedIn and iMessage draw for every page that is
 * not somebody's card - the landing page, the builder, the tutorial.
 *
 * Without one, a link to the free tool posted on a business page renders as
 * a grey rectangle with two lines of text under it, which is a poor advert
 * for a product whose whole pitch is that it looks deliberate. */

export const runtime = 'nodejs'
export const alt = 'ClearPath Cards — a free digital business card'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const A = '#4F46E5'

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        background: '#09090B', color: '#FAFAFA', fontFamily: 'sans-serif',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          flex: 1, padding: '0 0 0 76px',
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, color: '#8E86F0' }}>
            CLEARPATH CARDS
          </div>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.08, marginTop: 20, maxWidth: 620 }}>
            A free digital business card
          </div>
          <div style={{ fontSize: 28, color: '#BAC6D6', marginTop: 22, lineHeight: 1.45, maxWidth: 580 }}>
            One link, a QR code, and a button that puts your details straight into their phone.
          </div>
          <div style={{ fontSize: 24, color: '#7C8A9E', marginTop: 30 }}>
            card.clearpathautomation.io — no account, no cost
          </div>
        </div>

        {/* A card, small, at the edge: the product rather than a logo. */}
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 70 }}>
          <div style={{
            width: 310, height: 470, borderRadius: 26, background: '#121216',
            border: '1px solid rgba(255,255,255,0.14)', display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{ height: 76, width: '100%', background: `linear-gradient(135deg, ${A}, #2A24A8)`, display: 'flex' }} />
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
              <div style={{
                width: 84, height: 84, borderRadius: 999, marginTop: -40,
                background: `linear-gradient(135deg, ${A}, #2A24A8)`, border: '4px solid #121216',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 700, color: '#fff',
              }}>DW</div>
              <div style={{ fontSize: 26, fontWeight: 700, marginTop: 16 }}>Your Name</div>
              <div style={{ fontSize: 17, color: '#E8EDF4', marginTop: 8 }}>What you do</div>
              <div style={{ fontSize: 16, color: '#8E86F0', fontWeight: 600, marginTop: 4 }}>Your Company</div>
              <div style={{
                marginTop: 22, height: 50, borderRadius: 14, background: A,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: '#fff',
              }}>Save to contacts</div>
              <div style={{
                marginTop: 10, height: 44, borderRadius: 13,
                border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.045)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: '#E8EDF4', letterSpacing: 2,
              }}>SHARE THIS INFO</div>
              <div style={{
                marginTop: 10, height: 56, borderRadius: 13,
                border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.045)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 16,
              }}>
                <div style={{ fontSize: 11, color: '#9AA8BC', letterSpacing: 1.4, display: 'flex' }}>PHONE</div>
                <div style={{ fontSize: 17, color: '#E8EDF4', display: 'flex' }}>+1 555 555 5555</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
