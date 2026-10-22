/* Which cards this browser can edit.
 *
 * Owner controls appear only when this device actually holds the edit token,
 * so a stranger opening a card never sees an Edit button it cannot use. The
 * token is already a secret in a URL; keeping a copy in localStorage makes it
 * survivable across visits without inventing accounts.
 *
 * This is per-browser by design. Clearing site data loses it, which is the
 * same tradeoff as losing the edit link itself. */

const KEY = 'clearpath-cards:owned'

type Owned = Record<string, string> // slug -> token

function read(): Owned {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? (parsed as Owned) : {}
  } catch {
    return {}
  }
}

export function rememberOwned(slug: string, token: string): void {
  try {
    const all = read()
    all[slug] = token
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch { /* private mode */ }
}

export function tokenFor(slug: string): string | null {
  try { return read()[slug] ?? null } catch { return null }
}

export function forgetOwned(slug: string): void {
  try {
    const all = read()
    delete all[slug]
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch { /* private mode */ }
}
