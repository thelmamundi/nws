# Console Lab

Text-mode toys built on the live sky. First component: the **ASCII Astro Calendar**: a month as one block of text with a FIGlet title (any of the 332 fonts), a day grid, the sky's events, and transits to your natal chart.

**Area:** `pages/lab`

## What the calendar does
- **Title and second line** in any FIGlet font (`{month}`, `{mon}`, `{year}`, `{yy}` are filled in). Random button per line. **Browse every font** shows the title in all 332 fonts, 24 at a time, with a filter; click one to use it.
- **Day numbers** plain or in a FIGlet font (a short list of fonts small enough for a cell, then all of them). A number too wide for the cell falls back to plain digits.
- **Grid:** Monday or Sunday start, ISO week numbers (US week numbers with Sunday start), cell width and lines, borders single / double / ascii / dashed / shade. Days outside the month have no box, like a printed wall calendar.
- **Sky events** (each can be switched off): lunations and quarters with degree, stations, sign changes, aspects between planets, Moon sign changes, Moon aspects. A "Mo Ari" tag shows the Moon's sign as each day starts.
- **Natal:** exact transits (Sun to Pluto, optionally the Moon) to your natal planets, Ascendant and Midheaven, all five major aspects. Uses the birth chart saved in this browser by the other personal panels (`aw98_birth`); the **Birth chart** box on the page edits it.
- **Busy days** keep the most important events (lunations, stations, outer-planet transits first) and end with "+N more"; everything is in the lists under the grid.
- **Lists under the grid:** the month's sky in plain words with times, transits to your chart, and your natal positions.
- **Output:** Copy text, Save .txt, Save .html (colours kept), Print. Options: colour or mono, ink on paper (black on white), fit to width.
- Settings stay in this browser (`nws-lab-cal`). `lab.html#2026-11` opens a given month.

## Console
`CAL` or `CAL 2026-11` opens the calendar. `FIGLET [-f font] text` prints big letters in the console (spaces in font names as `_`, e.g. `-f ANSI_Shadow`). `FONTS [filter]` lists fonts. Fonts load the first time one of these runs.

## Where it lives
- `src/pages/lab.html`, `lab.html` (built)
- `assets/js/lab-calendar.js` (calendar, plus `window.NwsFiglet`, the font loader the console also uses)
- `assets/js/vendor/figlet.js` (figlet.js, MIT) and `assets/js/vendor/figlet-fonts.js` (all fonts, gzipped). Regenerate with `scripts/make-figlet-fonts.js` (instructions at the top of the file). They load only when the calendar or a console command needs them.
- Styles: the "Console Lab" block at the end of `assets/css/dos-skin.css`
- Birth chart hooks: `window.AW98.birth / setBirth / clearBirth / cities` in `assets/js/widgets.js`

## Start a chat
> In nws, area: pages/lab. Read areas/pages/lab/README.md and REQUESTS.md, make the changes, then log the round in docs/CHANGES.md.
