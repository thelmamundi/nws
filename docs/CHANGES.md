# Change log

Requests come in chat, one large batch at a time. After each batch I add a numbered entry here with **Comes with / Added / Changed / Fixed / Removed**. (`areas/` has a README per theme, page, part and widget if you ever want to point at one.)
Old-site inventory: `docs/FROM-WS.md`. Writing posts: `docs/POSTS.md`.

## Round 12 (current)
**Comes with:** the site exactly as in Round 11.
**Changed**
- The header planet is the WS one again (the original `ascii-art.js` from the old site's main page: the spinning ASCII planet that changes with the planetary day). Its colours follow each scheme's tokens: lit side, highlight, shadow and glow use the scheme's accent, white, complement, dim and grey.
**Removed:** the per-planet textures and limb darkening added in Round 9 (the planets looked different from the WS one).
**Process:** requests are one batch in chat; the Requests sections in the log and the per-area `REQUESTS.md` files are optional.

## Round 11
**Comes with:** the site exactly as in Round 10, plus the `areas/` folders.
**Added**
- `areas/`: one folder per theme (6), page (5), shared part (10) and instrument (21). Each has a `README.md` (what it is, the files it lives in, a line to paste into a new chat) and a `REQUESTS.md`. Index: `areas/README.md`.
- `CLAUDE.md` at the repo root: the working rules every chat picks up (build command, area convention, the log format, where colours live).
**Changed:** nothing on the site.
**Removed:** nothing.

## Round 10
**Comes with:** 6 schemes (DOS blue, BIOS, void green, void amber, paper, LITERAL LEGEND); pages home, weather, sky, post, about; full instrument set; Sky Link; console; Start menu > Colors.
**Added**
- Nav sub-menus say `< OPEN >` and `< CLOSE >` instead of arrows (all schemes).
- LITERAL LEGEND background: the nebula GIF is tiled twice (offset, lightened together) at native size, so it reads as one dense starfield.
- BIOS uses the soft 4-tone dither for thumbnails and art (blue to yellow), like DOS blue and LITERAL LEGEND.
**Changed**
- LITERAL LEGEND pinks: a touch redder than the old magenta, no longer rose-red (#ff3f8e / #c0105f / #7a0a58, window body #ffe6f1). Same dithered title bars, buttons and shadows, recoloured.
- LITERAL LEGEND screens: pink + darker blue (#5b84ff) + light blue (#8fd0ff). The yellow, green and teletext cyan are gone; retrograde and alerts are pink. Art and the header planet are light blue.
- LITERAL LEGEND title text is a dithered gradient pink to blue and back (was full rainbow).
- Headings are back to VT323. PixelOperator (text), Silkscreen (titles, nav, buttons) and dogica (clocks) stay.
- The 88x31 bar slots are 36 px high (88 x 36). Your own button images drop into `src/pages/index.html` in the `b88-bar`.
**Removed:** the Literal Legend logo in the masthead (NWS wordart is back); GothicPixels font.

## Round 9
**Comes with:** 6 schemes (DOS blue, BIOS, void green, void amber, paper, LITERAL LEGEND); pages home, weather, sky, post, about; full instrument set; Sky Link; console; Start menu > Colors.
**Added**
- LITERAL LEGEND uses your files: the nebula GIF **tiled** (2x, crisp), **PixelOperator** (text), **Silkscreen** (window titles, nav, buttons, labels), **GothicPixels** (headings and the rainbow title), **dogica** (clocks). LED screens keep VT323. Your logo GIF is the masthead, `purplebar.gif` is the divider line, `purpleroselg.gif` tops the footer.
- Pinks now come from the nebula: #e83058 / #b00030 / #780058 / #580030 on a rose-white window body (replaces the off-pink). Artwork is cyan (the rose's complement) instead of white.
- Drop shadows in LITERAL LEGEND are a dithered gradient, dark at the window edge to light away from it.
- Home: the intro moved into the black header next to the spinning planet; **Celestial System Status** took the old "Logging on" box's place; the middle bar is an **88x31 button bar** with two live clock buttons (your Clock GIFs).
- Taskbar tray: time to the **second**, and the icon is the **planetary hour's ruler** (changes each hour; hover for the name).
- Planets in the header are more realistic (per-planet textures: Sun granulation and spots, cratered Mercury and Moon with maria, banded Venus, Mars with caps and dark regions, Jupiter with the Great Red Spot, Saturn rings, Neptune dark spot, Pluto's heart) and still change with the planetary day.
- Posts: the header glyph is set per post (`art="glyph:mercury"`, a sign works too).
**Changed**
- Artwork dither: DOS blue and LITERAL LEGEND use the soft 4-tone dither; every other scheme uses the 1-bit bitmap. Pixel cells are 2 px (were 3).
- LITERAL LEGEND dither is 1.5x (`--dz`), softer: more shade steps between pinks.
**Fixed:** hovering a tile or archive row no longer turns it solid pink (the invisible full-card link was picking up the link hover colour in every scheme).
**Removed:** the "Logging on to the Network" box; the ASCII NWS banner in the intro.
**Notes:** 88x31 is the standard button size; slots are 88x31 inside a bar tall enough for 36 (`--b88-h` in the CSS if you want 36 exactly). The teletext colours for the LED screens stay (yellow "will do for now").

## Round 8
**Comes with:** 6 schemes (DOS blue, BIOS, void green, void amber, paper, LITERAL LEGEND); pages home, weather, sky, post, about; full instrument set; Sky Link; console; Start menu > Colors.
**Added**
- **LITERAL LEGEND** (replaces "pink pop"): black void with the animated pixel nebula as the page background (`assets/img/ll-space.gif`), pink DOS windows on top, rainbow dithered title text in the teletext colours.
- Teletext colours (red, green, yellow, cyan, magenta, white on black) for every LED screen in this scheme.
- All artwork in this scheme (planets, moon, header ASCII planet) is white 1-bit on black, like the dithered hands.
- Font slot for **dogica** (the Literal Legend page's pixel font): drop `dogica.ttf` into `assets/fonts/` (or install it) and window titles, nav, buttons, labels and chips switch to it.
- Start menu entry in Fraktur; console `theme literal`.
**Changed**
- Dither on bars, buttons and the rainbow title is half the size (1 px cells). `--dz` in the CSS scales it (1 = fine, 2 = previous size).
- Title bars are one wide left-to-right dither.
**Removed:** the pink sky, bitmapped clouds and glitter; the lemon/mint/pink LED colours (now teletext colours).
**Not done yet:** the GIFs and fonts from the Literal Legend page. The page file only names them; the `_files` folder wasn't included, and the site can't be fetched from here. Send the folder (or the .ttf and .gif files) and they get wired in.

## Round 7
**Comes with:** 6 schemes (DOS blue, BIOS, void green, void amber, paper, pink pop); pages home, weather, sky, post, about; full instrument set; Sky Link; console; Start menu > Colors.
**Added**
- **Sky Link** LED card on posts: pick a topic (`topic=communication`), it finds that topic's ruling planet and the CLOSEST real event, last or next (station, sign change, lunation, exact aspect). A second card, "Link your own chart", shows the house it is moving through and the planets it touches (birth details stay in the browser).
- Pink pop: bitmapped white clouds, dithered sky, dithered left-to-right title bars, dithered rainbow title text, pixel glitter, hearts.
- SOON tags are chips: bordered, on their own background, in every scheme.
- GLOW badge (void green, void amber) in the left rail; CRT badge on every other scheme. Both off by default.
- `docs/CHANGES.md`, `docs/FROM-WS.md`, `docs/POSTS.md`.
**Changed**
- Pop: finer dither (x2), pinker (raspberry text, hot-pink bars, baby-pink page), near-black screens, no grey.
- Void green is green only; void amber is amber only (no complement colours).
- BIOS is back to the original grey page with blue bars and blue screens.
- Dither tiles are generated by `scripts/make-dither-tiles.py`.
**Removed:** the teletext post screen (and its Bedstead font); smooth gradients and rounded pills in pink pop.

## Round 6
**Added:** per-scheme screens (only void green, void amber, paper true black); each scheme's widget accent plus complement (blue/yellow in DOS blue, blue in amber, orange in paper, mint in pink); dithered pink pop; CRT badge in the rail (off by default); `docs/CHANGES.md` request template.
**Changed:** scanlines no longer on by default.

## Round 5
**Added:** void-glow green and amber (black page, glow, tinted dithered starfield); Y2K pink pop scheme (glitter, sparkle cursor trail); black LED screens back.
**Changed:** Start menu > Colors lists six schemes.

## Round 4
**Added:** colour schemes back (DOS, BIOS, green, amber, paper) via Start menu and console `theme`, no on-page buttons; separate tan bevelled nav buttons; sample blog post page with a teletext screen; panels follow the scheme.
**Removed:** the single fixed look.

## Round 3
**Comes with:** the old Weathergirl 98 structure in a DOS blue skin, black LED panels.
**Added:** old hero header with ASCII planet, left rail (Navigation, Sky Now, Visit Counter, badges), status strip, Jupiter-style footer columns (SOON for unbuilt pages), Weather and Sky pages with the whole instrument set, Start bar and minimizable windows, console.
**Removed:** theme dock, CRT/ASCII switches, the first simple widget set.

## Rounds 1-2
First DOS pass on the CC-LINK layout: five themes, ASCII banner and tree menu, Bayer-dithered orb and Moon, `C:\>` console, a handful of sky widgets, theme dock.
