# Fonts

Inter is **self-hosted** from `public/fonts/`. It is not loaded from
`fonts.googleapis.com`, and it should not be moved back there.

## Why self-hosted

1. **Conluz is open source and self-hostable.** A runtime dependency on Google
   means an air-gapped or offline community instance renders in a fallback
   face. PRODUCT.md records self-hostability as a positioning claim; a hard
   dependency on a third-party CDN quietly undercuts it.
2. **Data protection.** Hotlinking Google Fonts transmits visitor IP addresses
   to a third party, which EU courts have held to be a GDPR issue. The users
   here are members of Spanish energy communities.
3. **Performance.** It removes a render-blocking third-party stylesheet plus a
   DNS + TLS round-trip. The previous markup preconnected to
   `fonts.googleapis.com` but *not* to `fonts.gstatic.com`, where the font
   files actually live — so the round-trip that mattered was never covered.

## How it is set up

`index.html` declares the faces inline and preloads the Latin subset, so the
declaration is available when the parser reaches it and the download starts
without waiting for JavaScript.

Inter is a **variable** font. Google's `css2` endpoint returns four separate
`@font-face` blocks for `wght@400;500;600;700`, but all four point at the *same*
file — we confirmed this by hashing them. One file per subset with
`font-weight: 100 900` therefore serves every weight, including weights we do
not currently use:

| File | Size | Covers |
|---|---|---|
| `inter-latin.woff2` | 48 KB | Spanish and the rest of Latin-1 |
| `inter-latin-ext.woff2` | 85 KB | Extended Latin, for the committed i18n work |

`unicode-range` means `latin-ext` is only fetched when a glyph actually needs
it, so the usual cost is the 48 KB Latin file alone.

## Updating

Re-fetch from the Google CSS endpoint with a modern browser User-Agent (it
serves `woff2` only to browsers that support it), take the `latin` and
`latin-ext` URLs, and replace the two files. Keep `font-weight: 100 900` — do
not reintroduce one face per weight. Update `public/fonts/OFL.txt` if the
upstream licence changes.
