# ClearPath Cards — card.clearpathautomation.io

A free digital business card. **No database, no server code, no environment variables.**

## The idea

A business card has to work forever. That is a hard promise for anything database-backed, so
nothing here hard-depends on a database. A card is a plain JSON object with two possible homes:

| Path | How it works | What it buys | What it costs |
|---|---|---|---|
| **Fragment** (built) | The whole card LZ-compressed into the URL after `#` | No database, no row, no server, no env var. Cannot be deleted or 404'd. The fragment is never transmitted, so the card never reaches a server at all. | Long links; no Open Graph preview; too long for a QR once a photo is inlined |
| **Shortlink** (not built) | A row in Postgres behind `/s/<id>` | Clean URLs, real OG previews, a view counter | Needs Supabase, and can fail |

The fragment path is built first deliberately: it is the half that is independently complete.
The shortlink path is an *upgrade* behind the same JSON — when it is added, publishing should try
the row and **fall back to the fragment on any failure**, so a misconfigured database degrades the
link's appearance and never the user's outcome.

## Routes

| Route | What it is |
|---|---|
| `/` | Landing page — what it is, why it is free |
| `/new` | The 4-step builder with a live phone preview |
| `/c#<data>` | A published card, decoded from the fragment in the browser |
| `/damian` | Damian's own card on a clean path — the email-signature link |

## Architecture

- `app/lib/card.ts` — **the model.** The `Card` type, link kinds, `hrefFor`/`displayFor`, and the
  vCard generator. No I/O. If you change the shape, bump `v` and keep the decoder reading old ones:
  published links must never rot.
- `app/lib/codec.ts` — LZ encode/decode to and from the fragment. A damaged link returns `null`,
  never throws.
- `app/lib/photo.ts` — centre-crops and downscales to a 320px JPEG data URL so a card carries its
  own image and depends on no image host.
- `app/lib/qr.ts` — returns `null` above ~1,200 characters rather than emitting a dense QR no
  camera can read. A card with a photo has no QR, and the UI says so.
- `app/components/CardView.tsx` — **one** card component, used by both the published page and the
  builder preview, so the preview cannot lie.

## Two things worth knowing before you change something

1. **vCard escaping is split in two.** `escStruct` escapes commas (N, ADR — comma is a delimiter
   there); `escText` does not (FN, ORG, TITLE, NOTE). Escaping a comma in `FN` is permitted by
   RFC 2426 and mishandled by enough parsers that it shows as `Damian Wroblewski\, PharmD` in
   someone's phone — the one place a card cannot look broken.
2. **The tab title on `/c` is set on a 150 ms timer.** App Router commits `<title>` during
   hydration, *after* normal effects, so the obvious version is silently reverted. The card exists
   only in the fragment, so there is no server-rendered title to configure instead.

## Still to do

- [ ] **Decide the contact email.** `app/damian/card.ts` publishes a personal Gmail, because that
      is what `clearpathautomation.io` currently publishes. `info@clearpathautomation.io` probably
      belongs on a business card instead. One constant, one line.
- [ ] **Add a phone number** to `app/damian/card.ts`, or decide deliberately not to.
- [ ] DNS: point `card.clearpathautomation.io` at the Vercel project.
- [ ] Shortlink path (`/s/<id>` + Supabase) with fallback-to-fragment on any failure.
- [ ] Token-based edit links — re-open a published card in the builder.
- [ ] PWA icons beyond the single SVG.

## Local

```bash
npm install
npm run dev
```

## Deploy

Static export-friendly Next 15 app; every route prerenders. Vercel project, no secrets, nothing
to configure. Domain: `card.clearpathautomation.io`.
