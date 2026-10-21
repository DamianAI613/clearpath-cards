import { type Card } from '../lib/card'

/* Damian's own card data.
 *
 * It lives in its own module because a Next.js page file may only export the
 * page, its metadata and a fixed set of route config fields - exporting the
 * card object from page.tsx is a build error.
 *
 * ---- The one line to change ----
 * CONTACT_EMAIL is a personal Gmail because that is what clearpathautomation.io
 * currently publishes. If info@clearpathautomation.io is live, change it here.
 */
const CONTACT_EMAIL = 'damianwroblewski2016@gmail.com'

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
    { kind: 'website',  label: 'Website',  value: 'clearpathautomation.io' },
    { kind: 'linkedin', label: 'LinkedIn', value: 'linkedin.com/in/damianwroblewski88' },
    { kind: 'github',   label: 'GitHub',   value: 'github.com/DamianAI613' },
  ],
}
