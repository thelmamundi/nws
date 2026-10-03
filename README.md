# nws

The CC-LINK layout (mobile header, sidebar of menu + widgets, content sections, footer) rebuilt as a **DOS** site, with the LED sky instruments from `ws` moved in.

- **Themes** (none black): `dos` blue, `bios` grey, `phosphor` green, `amber` umber, `paper`. Dock at bottom right, or console `THEME green`.
- **ASCII**: banner, tree menu, box-drawn frames, `[bar]` meters, and an ASCII renderer for all art.
- **Bitmap dithering**: 8x8 Bayer, 1-bit, in the theme's ink/paper colours (`assets/js/art.js`). `data-art="orb|moon"` draws procedural spheres (the Moon is the live phase). Any `<img class="dither" src="...">` is dithered too. The dock's ART switch flips everything between BITMAP and ASCII.
- **Console**: `HELP DIR CD THEME CRT ART SKY DATE CLS`, up/down for history.
- **Instruments** (`assets/js/widgets.js`, engine copied from `ws`): ON AIR ticker, Sky Now, Current Conditions, Next Exact Thing, Flight Board, Planet Speedometer. Text mode: 3-letter body codes, no emoji.

## Edit / run
Pages are `src/pages/*.html` plus `src/partials/*`. `node build.js` writes the root `*.html` (committed, so any static host works). Preview: `python3 -m http.server`.

Placeholders to replace: intro/about copy, link buttons, audio player ("Song of the Now"), your own images (use `class="dither"`).
Layout credit: CC-LINK by CC DebtDeath (linked in the footer). Font: VT323 (OFL).
