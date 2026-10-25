/* An annotated drawing of a card, rather than a screenshot of one.
 *
 * A screenshot goes stale the moment a button moves and nobody remembers to
 * retake it on three devices. This is drawn from the same tokens as the card
 * itself, so it stays recognisable, and the numbers are anchored to the
 * elements rather than floating beside them with leader lines that drift. */

const A = '#4F46E5'

function Badge({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="13" fill={A} stroke="#09090B" strokeWidth="2.5" />
      <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">{n}</text>
    </g>
  )
}

export default function CardDiagram() {
  return (
    <svg viewBox="0 0 320 620" width="100%" style={{ maxWidth: 320, display: 'block', margin: '0 auto' }}
      role="img" aria-label="A card with every control numbered">
      <rect x="8" y="8" width="304" height="604" rx="22" fill="#121216" stroke="rgba(255,255,255,0.12)" />
      <path d="M8 30a22 22 0 0 1 22-22h260a22 22 0 0 1 22 22v34H8z" fill={A} />

      {/* QR */}
      <rect x="236" y="18" width="58" height="58" rx="9" fill="#fff" />
      <g fill="#09090B">
        {[0,1,2,3,4,5].map(r => [0,1,2,3,4,5].map(c => ((r*7+c*3) % 4 < 2 ? (
          <rect key={`${r}-${c}`} x={243 + c * 8} y={25 + r * 8} width="6" height="6" />
        ) : null)))}
      </g>
      <text x="265" y="88" textAnchor="middle" fontSize="8" fontWeight="700" fill="#9AA8BC" letterSpacing="1">PRESS ME</text>
      <Badge x={232} y={18} n={1} />

      {/* identity */}
      <circle cx="56" cy="74" r="27" fill={A} stroke="#121216" strokeWidth="3" />
      <text x="56" y="81" textAnchor="middle" fontSize="18" fontWeight="700" fill="#fff">DW</text>
      <text x="28" y="130" fontSize="17" fontWeight="700" fill="#FAFAFA">Your Name</text>
      <text x="28" y="150" fontSize="11" fill="#E8EDF4">What you do</text>
      <text x="28" y="167" fontSize="11" fontWeight="650" fill="#8E86F0">Your Company</text>
      <text x="28" y="188" fontSize="10" fill="#BAC6D6">One line about the work</text>

      {/* save */}
      <rect x="24" y="204" width="272" height="42" rx="11" fill={A} />
      <text x="160" y="230" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">Save to contacts</text>
      <Badge x={24} y={204} n={2} />

      {/* share */}
      <rect x="24" y="254" width="272" height="38" rx="11" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.12)" />
      <text x="160" y="278" textAnchor="middle" fontSize="11" fontWeight="750" fill="#E8EDF4" letterSpacing="1.4">SHARE THIS INFO</text>
      <Badge x={24} y={254} n={3} />

      {/* phone */}
      <rect x="24" y="300" width="272" height="48" rx="11" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.12)" />
      <rect x="36" y="312" width="24" height="24" rx="7" fill="rgba(79,70,229,0.2)" />
      <text x="72" y="322" fontSize="8" fontWeight="650" fill="#9AA8BC" letterSpacing="0.8">PHONE</text>
      <text x="72" y="338" fontSize="12" fill="#E8EDF4">+1 555 555 5555</text>
      <Badge x={24} y={300} n={4} />

      {/* more */}
      <rect x="24" y="356" width="272" height="36" rx="11" fill="none" stroke="rgba(255,255,255,0.12)" />
      <text x="40" y="379" fontSize="11" fill="#9AA8BC">Email, Website and 2 more</text>
      <text x="278" y="379" fontSize="10" fill="#9AA8BC">▾</text>
      <Badge x={24} y={356} n={5} />

      {/* owner strip */}
      <line x1="8" y1="406" x2="312" y2="406" stroke="rgba(255,255,255,0.12)" />
      <text x="24" y="424" fontSize="8" fontWeight="700" fill="#7C8A9E" letterSpacing="1.4">YOURS</text>
      <rect x="24" y="432" width="74" height="26" rx="8" fill="rgba(79,70,229,0.2)" stroke="#8E86F0" />
      <text x="61" y="449" textAnchor="middle" fontSize="10" fontWeight="650" fill="#FAFAFA">Edit card</text>
      <rect x="104" y="432" width="72" height="26" rx="8" fill="none" stroke="rgba(255,255,255,0.12)" />
      <text x="140" y="449" textAnchor="middle" fontSize="10" fill="#9AA8BC">Show QR</text>
      <rect x="182" y="432" width="114" height="26" rx="8" fill="none" stroke="rgba(255,255,255,0.12)" />
      <text x="239" y="449" textAnchor="middle" fontSize="10" fill="#9AA8BC">Add to Home</text>
      <Badge x={24} y={432} n={6} />

      {/* footer */}
      <line x1="8" y1="476" x2="312" y2="476" stroke="rgba(255,255,255,0.12)" />
      <rect x="24" y="490" width="272" height="34" rx="10" fill="rgba(79,70,229,0.2)" stroke="#8E86F0" />
      <text x="160" y="512" textAnchor="middle" fontSize="11" fontWeight="700" fill="#FAFAFA">Build your own card — free</text>
      <text x="160" y="542" textAnchor="middle" fontSize="10" fontWeight="650" fill="#8E86F0">See what else ClearPath can do for you ↗</text>
      <rect x="24" y="554" width="132" height="30" rx="9" fill="none" stroke="rgba(255,255,255,0.12)" />
      <text x="90" y="573" textAnchor="middle" fontSize="10" fill="#9AA8BC">Text ClearPath</text>
      <rect x="164" y="554" width="132" height="30" rx="9" fill="none" stroke="rgba(255,255,255,0.12)" />
      <text x="230" y="573" textAnchor="middle" fontSize="10" fill="#9AA8BC">Email ClearPath</text>
      <text x="160" y="600" textAnchor="middle" fontSize="9" fill="#7C8A9E">Is this your card? Unlock editing</text>
      <Badge x={24} y={490} n={7} />
      <Badge x={290} y={596} n={8} />
    </svg>
  )
}
