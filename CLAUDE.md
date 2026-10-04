# nws: working notes for Claude

Static DOS-style site with live sky instruments. Branch: `claude/sharp-shannon-pirsde`. No build tools beyond Node.

- Edit `src/pages/*.html`, `src/partials/*`, `assets/`. Never edit the built root `*.html`; run `node build.js` after changes. `node build.js --single out.html` makes the one-file preview.
- The user names an area like `themes/literal-legend` or `widgets/radar`. Read `areas/<group>/<area>/README.md` (where the code lives) and `REQUESTS.md`, then do the work. Site-wide requests live under **Requests** in `docs/CHANGES.md`.
- After every round, add a numbered entry to `docs/CHANGES.md`: **Comes with / Added / Changed / Fixed / Removed**. Move handled requests out of the Requests sections.
- Colours are tokens in `assets/css/dos-skin.css` (one block per scheme). LITERAL LEGEND's dithered gradients are generated: edit `scripts/make-dither-tiles.py`, rerun, paste the output between the DITHER TILES markers.
- Schemes: dos, bios, phosphor (void green), amber (void amber), paper, legend (LITERAL LEGEND). Dither art: dos, bios, legend; 1-bit bitmap: the rest. Glow and CRT are opt-in (rail badge).
- Check changes by screenshotting with headless Chromium; the user reviews a one-file artifact preview.
- Plain, direct writing. No model identifiers in commits or files.
