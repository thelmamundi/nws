# nws

Weathergirl 98's structure (hero header with ASCII planet, left rail, status strip, instruments, link-column footer) joined to the CC-LINK sections, on a DOS blue screen. Black is kept for the LED panels, ticker and page headers, so it frames the page without filling it. One look, no theme switcher.

- **Pages:** `index` (home), `weather` (radar, impact, seismograph, traffic, time control), `sky` (conditions, flight board, next exact, changelog, lunar monitor, planetary clock, speedometer, status, compare, personal aspects), `about`.
- **Instruments:** `assets/js/widgets.js` + `astro-engine.js`, copied from `ws`. Everything is computed in the browser.
- **ASCII:** spinning planet in each header (`ascii-art.js`), tree menus, box frames, `C:\>` console in the left rail.
- **Bitmap dithering:** `assets/js/art.js`. `data-art="orb|moon"` draws 1-bit Bayer-dithered spheres (the Moon is the live phase); any `<img class="dither">` is dithered too. Colours come from `--art-bg` / `--art-ink` in `assets/css/dos-skin.css`.
- **Footer:** the old Jupiter-style link columns; pages that don't exist yet are marked SOON.

## Edit / run
Pages: `src/pages/*.html` inside `src/partials/layout.html`. `node build.js` writes the root `*.html` (committed, so any static host works). Preview with `python3 -m http.server`. `node build.js --single out.html` makes one self-contained file with all pages as tabs.

Styling: `assets/css/legacy.css` is the old theme's CSS (instrument internals); `assets/css/dos-skin.css` re-skins it. Placeholders to replace: intro/about copy, link buttons, post tiles, archive rows.
Layout credit: CC-LINK by CC DebtDeath (linked in the footer). Font: VT323 (OFL).
