# ClearPath Cards — card.clearpathautomation.io

A free digital business card. One link, a QR code, and a Save-to-contacts button that writes a
real vCard. No account, no signup, no login.

## The idea

A business card has to keep working, and it has to be correctable. Those two requirements pull in
opposite directions, so a card here has **two independent homes** and the app degrades from one to
the other rather than failing.

| Path | Where the card lives | What it buys | What it costs |
|---|---|---|---|
| **Stored** (default) | A row in Postgres behind `/s/<slug>` | Short links, real Open Graph previews, a view counter, and **editing in place** — the link you already handed out shows the new version | Needs a reachable database |
| **Fragment** (fallback) | LZ-compressed into the URL after `#` | No row, no server, no env var. Cannot be deleted or 404'd, and the fragment is never transmitted, so the card never reaches a server at all | Long links, no preview, too long for a QR once a photo is inlined, and **cannot be edited** |

Publishing tries the database first. If `DATABASE_URL` is absent, or the query throws, or the
network is down, publish **falls back to a fragment link and says so** instead of erroring. The
database is an upgrade to the card, never a dependency of it.

## Editing is a capability, not an account

Publishing returns a 48-character edit token. Only its SHA-256 is stored, compared in constant
time, so a database dump hands out no edit rights — and neither the owner nor the maintainer can
recover a lost token.

The edit link is `/new#edit=<slug>:<token>`. The token sits in the fragment deliberately: it never
reaches the server on a page load, only on the PATCH or DELETE that uses it. A wrong token and a
missing card both return 404, so the endpoint cannot be used to discover which slugs exist.

`DELETE` takes the token in an `x-edit-token` header rather than the query string, to keep it out
of access logs and browser history. Deletion is permanent, and that is the point: someone who
published a phone number must be able to make it stop existing.

## Routes

| Route | What it is |
|---|---|
| `/` | Landing page |
| `/new` | The 4-step builder, with a live phone preview. Also loads an existing card back in from any of its links |
| `/s/<slug>` | A stored card, server-rendered with per-card OG tags |
| `/c#<data>` | A fragment card, decoded in the browser |
| `/damian` | One fixed card on a clean path — deliberately not a row, since the route already gives it a short URL and its own OG tags |
| `/api/cards` | `POST` to publish |
| `/api/cards/<slug>` | `GET`, `PATCH`, `DELETE` |

## Architecture

- `app/lib/card.ts` — the model. The `Card` type, link kinds, and the vCard generator. No I/O. If
  you change the shape, bump `v` and keep the decoder reading older ones: published links must
  never rot.
- `app/lib/codec.ts` — LZ encode/decode for the fragment path. A damaged link returns `null`.
- `app/lib/db.ts` — the stored path. One `cards` table, created lazily and idempotently; every
  function returns null/false rather than throwing when there is no database.
- `app/lib/photo.ts` — centre-crops and downscales to a 320px JPEG data URL, so a card carries its
  own image and depends on no image host.
- `app/lib/qr.ts` — returns `null` above ~1,200 characters rather than emitting a dense QR no
  camera can read. A fragment card with a photo has no QR, and the UI says so.
- `app/components/CardView.tsx` — **one** card component, shared by the published pages and the
  builder preview, so the preview cannot lie.

## Four things worth knowing before you change something

1. **vCard escaping is split in two.** `escStruct` escapes commas (N, ADR — comma is a delimiter
   there); `escText` does not (FN, ORG, TITLE, NOTE). Escaping a comma in `FN` is permitted by
   RFC 2426 and mishandled by enough parsers that it renders as `Damian Wroblewski\, PharmD` in
   someone's phone — the one place a card cannot look broken.
2. **The tab title on `/c` is set on a 150 ms timer.** App Router commits `<title>` during
   hydration, *after* normal effects, so the obvious version is silently reverted. A fragment card
   has no server-rendered title to configure instead.
3. **Every colour used for text clears 4.5:1 against the background, measured.** The first version
   shipped body copy at 2.6:1. The accent is split into a fill and a derived lighter tint via
   `color-mix`, so accent-coloured type stays legible for any card accent.
4. **Storage is Neon, not Supabase.** Supabase's free plan pauses a project after ~7 days of low
   activity and needs a human to click Resume — which would break every short link, the exact
   failure the stored path exists to prevent. Neon scales to zero after 5 minutes and wakes itself
   on the next query. For a card nobody opens for a month, that difference is the whole product.

## Still to do

- [ ] A way to list or recover your own cards. Lose the edit link and the card is permanent.
- [ ] Rate limiting on `POST /api/cards` — nothing currently stops bulk row creation.
- [ ] PWA icons beyond the single SVG.
- [ ] Decide whether `/damian` should carry a phone number by default for a public card.

## Local

```bash
npm install
npm run dev
```

Runs without any environment variable: with no `DATABASE_URL`, publishing uses the fragment path
and the stored routes return `503 storage_unconfigured`. That is a supported mode, not a broken
one, and it is worth testing in.

## Deploy

Vercel project `clearpath-cards`, auto-deploys from `main`. Postgres is Neon via the Vercel
marketplace, which injects `DATABASE_URL` and the `POSTGRES_*`/`PG*` set as sensitive variables.
Domain: `card.clearpathautomation.io`.
