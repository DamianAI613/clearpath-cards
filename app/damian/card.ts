import { type Card } from '../lib/card'

/* Damian's own card data.
 *
 * It lives in its own module because a Next.js page file may only export the
 * page, its metadata and a fixed set of route config fields - exporting the
 * card object from page.tsx is a build error.
 *
 * One business address, not two: support@ and info@ both forward to the same
 * inbox, and a card offering a choice makes the reader make one. info@ is the
 * address for someone who has not hired you yet, which is every person this
 * card is handed to. Swap the constant if that ever stops being true.
 *
 * The phone is stored in +1 form so the tel: link dials from outside the US
 * as well; the card prints exactly this string.
 */
const CONTACT_EMAIL = 'info@clearpathautomation.io'
const CONTACT_PHONE = '+1 224 628 0264'

export const CARD: Card = {
  v: 1,
  name: 'Damian Wroblewski',
  credentials: 'PharmD, MHA',
  title: 'Founder & Engineer',
  org: 'ClearPath Automation LLC',
  tagline:
    'Custom automation, AI agents and purpose-built software — engineered by a clinical pharmacist who writes the code.',
  location: 'Carpentersville, IL · remote across the US',
  accent: '#4F46E5',
  links: [
    { kind: 'email',    label: 'Email',    value: CONTACT_EMAIL },
    { kind: 'phone',    label: 'Phone',    value: CONTACT_PHONE },
    { kind: 'website',  label: 'Website',  value: 'clearpathautomation.io' },
    { kind: 'linkedin', label: 'LinkedIn', value: 'linkedin.com/in/damianwroblewski88' },
    { kind: 'github',   label: 'GitHub',   value: 'github.com/DamianAI613' },
  ],
}
