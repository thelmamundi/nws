# Change log

Requests come in chat, one large batch at a time. After each batch I add a numbered entry here with **Comes with / Added / Changed / Fixed / Removed**. (`areas/` has a README per theme, page, part and widget if you ever want to point at one.)
Old-site inventory: `docs/FROM-WS.md`. Writing posts: `docs/POSTS.md`.

## Round 17 (current)
**Comes with:** the site as in Round 16, plus a New Tab dashboard extension.
**Added**
- **NWS New Tab** (`extension/`, built by `node build.js --extension`): a Chrome / Edge / Brave extension that replaces the new tab page with a dashboard of the live gadgets. Same themes, fonts and window look as the site.
  - Top bar: clock and date, a web search box, a **Colors** picker (all six schemes) and a **Gadgets** button.
  - **Gadgets** lists 16 instruments with checkboxes; what you tick is remembered in this browser. Drag a gadget by its title bar to reorder.
  - On by default: Current Conditions, Next Exact Thing, Celestial Flight Board, Current Sky Chart, Lunar Motion Monitor, Planetary Clock, Your Active Personal Aspects. Off by default: Transit Chart, Radar, Impact Forecast, Current Aspects, Planet Speedometer, System Status, Time Control, Sky Changelog, Since Your Last Visit.
  - Install: chrome://extensions, turn on Developer mode, Load unpacked, pick the `extension/` folder.
  - Source: `src/newtab/` (page, script, css). `extension/` is generated; do not edit it.
- **Firefox build** (`extension-firefox/`, same page, manifest adds a Firefox add-on id). Install: about:debugging, This Firefox, Load Temporary Add-on, pick its `manifest.json`. Temporary add-ons are removed when Firefox closes; keeping it needs Mozilla signing (not set up) or Firefox Developer Edition / Nightly. Not tested in Firefox (not available here).
- **Full-screen dashboard** (`dashboard.html`, built by `node build.js --dashboard`): one self-contained file (css, js, fonts and images inline) with all 16 gadgets on, packed into balanced columns and scaled to fit any window or screen size (it re-fits on resize and every minute). Host it anywhere, or open it from disk. Add `#bare` to the address to hide the top bar. The clock and a Colors picker sit in the top bar.
- **Wallpaper Engine folder** (`wallpaper/`: `index.html`, `project.json`, `preview.jpg`), a web wallpaper with the same page. In Wallpaper Engine: Create Wallpaper or Open from file, pick `wallpaper/project.json`. It can't be clicked, so set colors beforehand (open `dashboard.html` in a browser, pick a colour, the choice is stored per page) and the personal-chart gadgets show the sample chart. Not tested inside Wallpaper Engine.
- **Stream overlay** (`overlay.html`, built by `node build.js --overlay`): a 1920 x 1080 OBS / Streamlabs browser source in the site style, one self-contained file.
  - **Live scene** (default) has a transparent background: a title window with the clock (top left), Current Conditions and Next Exact Thing (left), a facecam frame with a see-through hole, the Current Sky Chart with aspects and the Lunar Motion Monitor (right), and the ON AIR ticker along the bottom. The middle is left clear for gameplay or screen share.
  - **Starting soon / Be right back / Thanks for watching** scenes: a centre card with a big title, subtitle, a countdown and the sky chart, on the theme background, with the ticker.
  - Controlled from the address, no editing: `overlay.html?scene=live|starting|brb|ending&title=My+Stream&sub=Tarot+night&mins=10` (or `&until=21:00`), `&theme=legend` (dos, bios, phosphor, amber, paper, legend), `&cam=0` hides the cam frame. Add the file in OBS as a Browser source with the local file option, width 1920, height 1080.
  - Scales to any browser source size. Not tested inside OBS (checked in headless Chromium with a transparent screenshot).
- **YouTube kit** (`youtube.html`, built by `node build.js --youtube`; rendered by `node scripts/render-youtube.js`), all in the site skin with the real sky chart, planet glyph sprites and Bayer dither wipes. Output in `youtube/`:
  - `intro.mp4` (6 s, 1080p): dither fade up from black, the live sky wheel grows and slides left, an "NWS" window types out your title with a cycling planet glyph, wipe to black.
  - `end.mp4` (20 s): "thanks for watching" window, two empty VIDEO slots and a SUBSCRIBE ring where YouTube's end-screen elements go, a slowly turning wheel and a progress bar.
  - `card.mp4` (2.5 s): chapter title card for transitions, with dither wipes in and out.
  - `lowerthird.webm` (6 s, transparent) and `lowerthird.png`: a name / subtitle window that steps in and out.
  - `bug.png` (transparent): the corner SUBSCRIBE watermark.
  - `thumbnail.png` (1280 x 720): huge outlined title, "ON AIR" window with a planet glyph, the sky wheel floating on the starfield.
  - Re-render with your own words and colours: `node scripts/render-youtube.js --title "Your Title" --sub "your line" --theme dos --only thumb` (themes dos, bios, phosphor, amber, paper, legend; `--only` takes intro,end,card,lower,bug,thumb). Needs `npm i playwright-core`, Chromium and ffmpeg. Motion is stepped at 12 frames per second on purpose; it is encoded at 30.
  - Round 17b changes: (1) the LITERAL LEGEND nebula is one big picture, not tiled (stretched to cover, cropped from the top where the clouds are); (2) kit windows are calmer: one flat 4px frame, a plain title strip, no stacked shadows, and the body is an LED screen (black panel, the theme's LED colour); (3) every asset is rendered per theme into `youtube/<theme>/` (`youtube/paper/` and `youtube/legend/` are in the repo); (4) new over-the-shoulder backdrops `shoulder-left.png` / `shoulder-right.png`: six large LED gadgets (sky chart, conditions, next exact, moon, flight board, speedometer) on one side and the other ~38% left empty for the person (left = person on the left). Built from `dashboard.html?bare&shoulder=left&only=...`, which also accepts any gadget list. Windows on the rest of the site are unchanged; say if you want the same calmer windows site-wide.
  - Round 17c: (1) the wheel in the intro, card, end screen and credits is now a **time-lapse**: the sky moves forward (about 4 days per second in the intro) so planets and the rising sign visibly change, instead of only spinning; add `&bi=1` to the page address for a transit bi-wheel (sample natal chart). (2) New **`credits.mp4`** (18 s): a rolling credits list in an LED window with two time-lapse wheels at the sides; edit the roles and names with `credits=Hosted by:Name;Music:Song` in the address (defaults are placeholders). (3) New **live-chat stream mockup**, `chat.png` and `chat.mp4` (10 s): a big MAIN SCREEN area, a cam frame, a LIVE CHAT column with made-up messages that appear one by one, and an ON AIR ticker with the real planet positions scrolling along the bottom. The chat names and lines are placeholders.
  - Round 17d: **the intro now opens with a planet parade** (about 3 seconds): the dithered **pixel planets** (from the WS site, now `assets/js/planet-art.js`) in one LED window and the spinning **ASCII planet** in another, cycling Sun through Pluto with the planet's name in the title bars; then the time-lapse wheel grows, slides left, and the title types out. The intro is now 9 seconds (was 6). The pixel planets keep their natural colours; the ASCII planet follows the theme (amber, white and blue; pink and blue on LITERAL LEGEND). Both are in LED windows so they read on Paper too. The title card, end screen and credits are unchanged.
  - The samples in `youtube/` use the title "Pluto was never demoted" and the LITERAL LEGEND colours.
- The chart wheel takes a `clear: true` option that leaves the desk transparent.
- `areas/pages/newtab/` README.

## Round 16
**Comes with:** the site as in Round 15, with the Charts page wheels redrawn.
**Changed** (both wheels on the Charts page: **Current Sky Chart** and **Transit Chart**, `assets/js/chart-wheel.js`)
- **Wheel body is silver** (Win98 grey, white and dark-grey bevels) in every theme. The theme colour goes on the **sign ring segments** (solid element colours), the aspect lines, markers and hub.
- **Planet and sign glyphs are 32px** (up from about 16px). Planet buttons grew to fit; the wheel's radii were scaled to match.
- **Pixelization halved:** the pixel grid is 336 x 336 (was 168 x 168), so each pixel is 1.5px on screen.
- **No dither:** all fills are flat colour. Bevels, the ring and the house numbers are redrawn at the finer grid.
- `chartShell` canvases in `widgets.js` now declare 336 x 336.
**Removed:** Bayer dither fills on the wheels (sign ring, planet track, desk).

## Round 15
**Comes with:** the site as in Round 14, plus a Charts page.
**Added**
- **Charts** page (nav button "Charts", Start menu, console `cd charts`) with Time Control, a **Current Sky Chart** and a **Transit Chart**.
  - **Current Sky Chart:** a wheel with the Ascendant on the left, signs counter-clockwise, whole-sign houses 1-12, planet markers with a leader tick to the true degree, a degree-tick ring, and aspect lines (red = hard, blue = easy; dotted = easy, doubled = under 1 degree). Next to it: a planet table (position, house, retrograde) and the aspects in orb. Rising sign uses your time-zone city (add a city on the Sky page for a precise one).
  - **Transit Chart:** a bi-wheel: the sky now on the outer ring, a natal chart on the inner ring, and lines for transit-to-natal aspects within 3 degrees, with a table of the tightest ones. It shows a sample natal chart until you link yours (birth details stay in the browser; same store as Sky Link and Personal Aspects).
  - Both follow Time Control.
- **A chart style per theme**, drawn pixel by pixel on a 168 x 168 grid and scaled up crisp, with Windows 98 mechanics (raised and sunken bevels lit from the top left, Bayer dither fills, a limited palette) but none of the Windows chrome:
  - DOS blue: silver Win98 bevels on a teal desk, raised square planet buttons, a white sunken planet track, red/green/blue/teal sign segments dithered into silver.
  - BIOS: grey bevels around a blue setup-screen well, yellow lines, squares.
  - Void green and void amber: single-colour phosphor, dither densities for the four elements, circle or diamond markers, ring hub.
  - Paper: ink on cream with hatched desk, engraved ring, round markers and a cross hub.
  - LITERAL LEGEND: a dithered pink angular gradient sign ring, black starfield desk, light-blue easy aspects, pink hard aspects, a heart hub.
- `areas/` folders for `pages/charts`, `widgets/chartnow`, `widgets/charttransit`.
**Changed:** the old Radar, Impact Forecast, Seismograph and Speedometer are untouched.
**Not done:** the old chart widgets are not restyled to the Win98 look yet (say if you want that next); no Midheaven/Ascendant angle labels and no Placidus houses (whole-sign only).

## Round 14
**Comes with:** the site as in Round 13, with Super VCR Mono limited to article titles and five new articles.
**Added**
- **Posts** page (`posts.html`, nav button "Posts"): an archive of all six articles with their spice rating.
- Five satirical planet hot-take articles, each with its own live Sky Link card (topic planet, closest phenomenon, link your own chart) and a matching spinning glyph in the header:
  - *Pluto Was Never Demoted* (power)
  - *The Saturn Return Is Just a Performance Review* (discipline)
  - *Venus Is Not About Love. It Is About Taste.* (money)
  - *The Moon Does Not Care About Your Ritual* (rhythm)
  - *Jupiter Is Not Luck. It Is Compound Interest.* (luck)
  The Mercury article is the sixth. Home tiles and the archive link to them. All are placeholder satire.
**Changed**
- **Super VCR Mono is used only for the big header title on article pages.** Everything else, including all other page titles, section labels, window title bars and the Sky Link card, is Perfect DOS VGA 437 (titles 48 px, section labels and title bars 16 px, post headings 32 px).
- The Posts button highlights on every article page; the console `cd posts` works.
**Fixed:** the Super VCR font briefly applied to all headings (Round 13); it is now scoped as above.

## Round 13
**Comes with:** the site exactly as in Round 12, with new fonts.
**Added**
- **Perfect DOS VGA 437** (Win version) is the main font everywhere: body text, LED screens, tables, buttons, nav, the ticker, chart labels, the ASCII graphs and the forecast card. It is an 8x16 bitmap font, so text is 16 px (big countdown 48 px, big readouts 32 px) to stay crisp.
- **Super VCR Mono** is the heading font: page titles (36 px), section labels, box headings, footer column headings, post headings (24 px) and window title bars (12 px).
- Font credits in the footer fine print (Super VCR Mono is CC BY 4.0, so the credit is required); licence and readme files are in `assets/fonts/`.
**Changed**
- Text is a little smaller than the old VT323 (16 px instead of 19-24 px). The header planet is set at 12 px so it keeps its size.
- Hearts, arrows and planet signs are not in these fonts and fall back to VT323 or the symbol font, as before.
**Removed:** the LITERAL LEGEND fonts PixelOperator and Silkscreen. LITERAL LEGEND keeps dogica for its clock digits only. VT323 stays only as the fallback.

## Round 12
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
