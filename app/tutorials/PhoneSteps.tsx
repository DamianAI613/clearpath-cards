/* Three little phones per platform, because "tap Share, then Add to Home
 * Screen" means nothing until you have seen which Share. */

type Step = { caption: string; draw: 'menu-ios' | 'menu-android' | 'sheet' | 'home' | 'card' }

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <figure style={{ margin: 0, flex: '1 1 140px', minWidth: 130, maxWidth: 170 }}>
      <svg viewBox="0 0 150 250" width="100%" role="img" aria-label={label}>
        <rect x="5" y="5" width="140" height="240" rx="18" fill="#121216" stroke="rgba(255,255,255,0.14)" />
        {children}
      </svg>
      <figcaption style={{ fontSize: '0.8rem', color: 'var(--cc-muted)', lineHeight: 1.5, marginTop: 8 }}>
        {label}
      </figcaption>
    </figure>
  )
}

const A = '#4F46E5'
const G = '#34D399'

/* An arrow that points AT a thing from empty space, rather than a ring
 * drawn on top of it. The first version circled its target, which put a
 * green disc directly over the words "Add to Home Screen" - covering the
 * one thing the picture exists to show. */
function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  const head = (spread: number) =>
    `${x2 - 9 * Math.cos(a - spread)},${y2 - 9 * Math.sin(a - spread)}`
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={G} strokeWidth="2.2" strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${head(0.45)} ${head(-0.45)}`} fill={G} />
    </g>
  )
}

export function IphoneSteps() {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <Frame label="1. Open the card in Safari and tap the Share button in the toolbar at the bottom.">
        <rect x="14" y="24" width="122" height="180" rx="10" fill="#09090B" />
        <rect x="24" y="36" width="60" height="7" rx="3" fill="#FAFAFA" />
        <rect x="24" y="52" width="100" height="5" rx="2" fill="#3A3A45" />
        <rect x="24" y="70" width="102" height="20" rx="6" fill={A} />
        <rect x="5" y="212" width="140" height="33" rx="0" fill="#1C1C22" />
        <path d="M61 230 v-12 M56 223 l5 -5 5 5 M53 232 h16" stroke="#8E86F0" strokeWidth="2" fill="none" strokeLinecap="round" />
        <Arrow x1={108} y1={200} x2={72} y2={222} />
      </Frame>
      <Frame label="2. Scroll the grey sheet down and tap Add to Home Screen.">
        <rect x="14" y="90" width="122" height="150" rx="12" fill="#1C1C22" />
        <rect x="26" y="104" width="98" height="12" rx="4" fill="#2A2A33" />
        <rect x="26" y="126" width="98" height="12" rx="4" fill="#2A2A33" />
        <rect x="26" y="150" width="98" height="18" rx="5" fill="#2F2F3A" stroke="#34D399" strokeWidth="1.5" />
        <text x="34" y="163" fontSize="7.5" fill="#E8EDF4">Add to Home Screen</text>
        <Arrow x1={126} y1={202} x2={116} y2={173} />
      </Frame>
      <Frame label="3. It saves as My Card. If it is not on the page you are looking at, swipe down and search that name.">
        <rect x="14" y="24" width="122" height="200" rx="10" fill="#0E1726" />
        <rect x="26" y="44" width="30" height="30" rx="9" fill={A} />
        <text x="41" y="64" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">DW</text>
        <text x="41" y="86" textAnchor="middle" fontSize="7" fill="#fff">My Card</text>
        <rect x="70" y="44" width="30" height="30" rx="9" fill="#2A2A33" />
        <rect x="26" y="98" width="30" height="30" rx="9" fill="#2A2A33" />
        <rect x="70" y="98" width="30" height="30" rx="9" fill="#2A2A33" />
        <Arrow x1={108} y1={28} x2={58} y2={48} />
      </Frame>
    </div>
  )
}

export function AndroidSteps() {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <Frame label="1. Open the card in Chrome and tap Add to Home Screen on the card itself — it is under YOURS.">
        <rect x="14" y="24" width="122" height="200" rx="10" fill="#09090B" />
        <rect x="24" y="36" width="60" height="7" rx="3" fill="#FAFAFA" />
        <rect x="24" y="54" width="102" height="18" rx="6" fill={A} />
        <rect x="24" y="80" width="102" height="15" rx="5" fill="#1C1C22" stroke="rgba(255,255,255,0.12)" />
        <text x="26" y="112" fontSize="6.5" fill="#7C8A9E" letterSpacing="0.8">YOURS</text>
        <rect x="24" y="118" width="102" height="17" rx="6" fill="none" stroke="#34D399" strokeWidth="1.5" />
        <text x="32" y="130" fontSize="7" fill="#E8EDF4">Add to Home Screen</text>
        <Arrow x1={122} y1={172} x2={112} y2={140} />
      </Frame>
      <Frame label="2. Chrome asks to install it. Tap Install — not Cancel. This is the step that makes it an app rather than a bookmark.">
        <rect x="14" y="80" width="122" height="96" rx="12" fill="#1C1C22" />
        <rect x="26" y="94" width="26" height="26" rx="8" fill={A} />
        <text x="39" y="111" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">DW</text>
        <text x="60" y="104" fontSize="8" fill="#FAFAFA">My Card</text>
        <text x="60" y="116" fontSize="6.5" fill="#9AA8BC">card.clearpathautomation.io</text>
        <rect x="76" y="140" width="48" height="19" rx="6" fill="#34D399" />
        <text x="100" y="153" textAnchor="middle" fontSize="8" fontWeight="700" fill="#09090B">Install</text>
        <Arrow x1={58} y1={188} x2={88} y2={164} />
      </Frame>
      <Frame label="3. Samsung often puts new apps in the app list rather than the home screen. Swipe up, long-press My Card, then Add to Home.">
        <rect x="14" y="24" width="122" height="200" rx="10" fill="#0E1726" />
        <rect x="26" y="44" width="28" height="28" rx="9" fill={A} />
        <text x="40" y="63" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">DW</text>
        <text x="40" y="84" textAnchor="middle" fontSize="7" fill="#fff">My Card</text>
        <rect x="68" y="44" width="28" height="28" rx="9" fill="#2A2A33" />
        <rect x="26" y="96" width="28" height="28" rx="9" fill="#2A2A33" />
        <rect x="68" y="96" width="28" height="28" rx="9" fill="#2A2A33" />
        <rect x="40" y="150" width="70" height="16" rx="5" fill="#2F2F3A" stroke="#34D399" strokeWidth="1.2" />
        <text x="47" y="161" fontSize="7" fill="#E8EDF4">Add to Home</text>
        <Arrow x1={126} y1={198} x2={108} y2={171} />
      </Frame>
    </div>
  )
}
