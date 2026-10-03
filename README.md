# nws

Weathergirl 98's structure (hero header with ASCII planet, left rail, status strip, instruments, link-column footer) joined to the CC-LINK sections, on a DOS blue screen. Six colour schemes: DOS blue (default), BIOS grey, void green and void amber (black page, glow, tinted starfield), paper, and LITERAL LEGEND (animated pixel nebula, pink DOS windows, teletext-colour screens, white 1-bit art). Screens use each scheme's own dark tone; only void green, void amber and paper are true black. Widget colours are scheme pairs (accent + complement). CRT scanlines are off by default; the CRT badge in the left rail turns them on. LITERAL LEGEND's gradients are Bayer-dithered tiles (`scripts/make-dither-tiles.py`). No on-page buttons: pick a scheme in the Start menu > Colors, or type `theme green` in the console. Nav is separate tan bevelled buttons.

- **Pages:** `index` (home), `weather` (radar, impact, seismograph, traffic, time control), `sky` (conditions, flight board, next exact, changelog, lunar monitor, planetary clock, speedometer, status, compare, personal aspects), `post` (sample blog post with a live teletext screen), `about`.
- **Instruments:** `assets/js/widgets.js` + `astro-engine.js`, copied from `ws`. Everything is computed in the browser.
- **ASCII:** spinning planet in each header (`ascii-art.js`), tree menus, box frames, `C:\>` console in the left rail.
- **Bitmap dithering:** `assets/js/art.js`. `data-art="orb|moon"` draws 1-bit Bayer-dithered spheres (the Moon is the live phase); any `<img class="dither">` is dithered too. Colours come from `--art-bg` / `--art-ink` in `assets/css/dos-skin.css`.
- **Footer:** the old Jupiter-style link columns; pages that don't exist yet are marked SOON.

## Edit / run
Pages: `src/pages/*.html` inside `src/partials/layout.html`. `node build.js` writes the root `*.html` (committed, so any static host works). Preview with `python3 -m http.server`. `node build.js --single out.html` makes one self-contained file with all pages as tabs.

Styling: `assets/css/legacy.css` is the old theme's CSS (instrument internals); `assets/css/dos-skin.css` re-skins it. Placeholders to replace: intro/about copy, link buttons, post tiles, archive rows.
Layout credit: CC-LINK by CC DebtDeath (linked in the footer). Font: VT323 (OFL).

Docs: `docs/CHANGES.md` (log), `docs/REQUESTS.md` (how to ask), `docs/FROM-WS.md` (old site inventory), `docs/POSTS.md` (evergreen posts).
