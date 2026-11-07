# Valuo brand kit

Single source of truth for the Valuo brand. Used by the landing (`valuo.ar`) and the app (`app.valuo.ar`).
Brand book (rules, voice, do/don't): [`BRAND.md`](BRAND.md) — in Spanish.

## Files
| Path | What | Use |
|---|---|---|
| `tokens.json` | Design tokens (colors light/dark, type scale, spacing, radius, shadow, motion) | Source of truth. Never hardcode a color/size that exists here. |
| `tokens.css` | CSS custom properties generated from `tokens.json` (theme follows the OS; `.dark`/`.light` on `<html>` forces it; `data-theme="dark|light"` forces it on any element, e.g. an always-dark band) | Import once; map to Tailwind 4 `@theme` / shadcn variables. Regenerate, don't edit. |
| `logo/valuo-wordmark-light.svg` · `-dark.svg` | Wordmark "valuo" + amber dot, text converted to outlines | Headers, landing, emails, OG images. Light = on light bg; dark = on dark bg. |
| `logo/valuo-wordmark-mono-*.svg` | One-color versions | Only where color is impossible (stamps, embossing, 1-color print). |
| `logo/valuo-mark-light.svg` · `-dark.svg` | Mark "v." without background | Small inline uses next to text. |
| `icons/app-icon.svg` | Mark on ink rounded square (master) | Store listings, marketing, social avatar. |
| `icons/app-icon-square.svg` | Same, square corners (OS rounds it) | Source for `icon-192/512.png`, `apple-touch-icon.png`. |
| `icons/app-icon-maskable.svg` | Full-bleed, mark inside the 80% safe zone | PWA manifest `purpose: "maskable"`. |
| `icons/app-icon-amber.svg` | Amber variant | Marketing only, not the app icon. |
| `icons/favicon.svg`, `png/favicon.ico` | Favicon | `<link rel="icon">` (SVG first, ICO fallback). |
| `png/*` | Rendered PNGs (192, 512, maskable, 180 apple, 1024 master, wordmark previews) | PWA manifest, iOS, places that don't take SVG. |
| `scripts/` | `build_logos.py` (needs fontTools + Manrope 800 woff2), `build_css.py` | Regenerate assets after a token or logo change. |

## Rules
- Clear space around the wordmark ≥ the height of the "a". Minimum width: 72 px (wordmark), 16 px (icon).
- Never recolor, stretch, outline, add effects, or change the dot size/position. The dot is always `accent` (amber), the letters always `ink`.
- The font Manrope is self-hosted in the apps (variable, `font-display: swap`); the logo files do not depend on it.
