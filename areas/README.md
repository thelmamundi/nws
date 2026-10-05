# Areas

One folder per thing on the site. Each has a **README.md** (what it is, which files it lives in, a line to paste into a new chat) and a **REQUESTS.md** (write what you want changed).

The repo is one project: a chat is tied to the nws repo, not to a folder. The folder tells me where to look and keeps your requests together. Start a chat, paste the line from the area's README, and I work from that area's files.

Site-wide or cross-area changes: write them under **Requests** in `docs/CHANGES.md`. Every finished round is logged there.

## Colour schemes

| Area | What |
|---|---|
| [`themes/dos-blue`](themes/dos-blue/README.md) | The default look: DOS blue page, tan bevelled nav, navy screens, yellow and blue widget pair, soft 4-tone dither art |
| [`themes/bios`](themes/bios/README.md) | Grey page, blue bars and screens, yellow accents |
| [`themes/void-green`](themes/void-green/README.md) | Black page, phosphor green only, tinted starfield, optional GLOW (badge in the left rail) |
| [`themes/void-amber`](themes/void-amber/README.md) | Black page, amber only, tinted starfield, optional GLOW |
| [`themes/paper`](themes/paper/README.md) | Ink on warm paper with true-black screens and orange widget accents |
| [`themes/literal-legend`](themes/literal-legend/README.md) | Black void with the tiled animated nebula, pink DOS windows (dithered title bars, buttons, shadows), pink + dark blue + light blue screens, pixel sparkle cursor, PixelOperator / Silkscreen / dogica fonts |

## Pages

| Area | What |
|---|---|
| [`pages/home`](pages/home/README.md) | Header with intro, PUBLIC SKY strip, Celestial System Status, 88x31 button bar, Latest tiles, Sky Now, forecast card, Updates, Link Back, Archive |
| [`pages/weather`](pages/weather/README.md) | Weather radar page: Since Your Last Visit, Current Aspects, Conditions, Flight Board, Radar, Impact Forecast, Seismograph, Traffic, Time Control |
| [`pages/sky`](pages/sky/README.md) | Sky desk page: the full instrument set |
| [`pages/posts`](pages/posts/README.md) | Posts archive and the six articles |
| [`pages/post`](pages/post/README.md) | Article template with the live Sky Link card (topic planet, closest phenomenon, link your own chart) |
| [`pages/about`](pages/about/README.md) | About page (placeholder copy) and Where To Find Me |

## Shared parts

| Area | What |
|---|---|
| [`parts/left-rail`](parts/left-rail/README.md) | Navigation window (separate tan buttons, `< OPEN >` / `< CLOSE >` sub-menus), Sky Now, Visit Counter, badges, CRT / GLOW badge, console |
| [`parts/header-hero`](parts/header-hero/README.md) | Eyebrow chips, big title, mast chips, intro, and the spinning ASCII planet or glyph (changes with the planetary day on home) |
| [`parts/footer`](parts/footer/README.md) | Link columns (SOON chips for unbuilt pages), fine print, credit |
| [`parts/taskbar-tray`](parts/taskbar-tray/README.md) | Start menu with Colors, minimized windows, tray clock to the second and the planetary-hour icon |
| [`parts/console`](parts/console/README.md) | The `C:\>` console in the left rail: help, dir, cd, sky, theme, crt, glow |
| [`parts/on-air-ticker`](parts/on-air-ticker/README.md) | The scrolling transit tape under the page header |
| [`parts/button-bar-88x31`](parts/button-bar-88x31/README.md) | The scrolling bar of 88x31 (slots 88x36) button graphics on home, including the live clock buttons |
| [`parts/art-dither`](parts/art-dither/README.md) | Procedural planets and Moon, `img.dither` thumbnails: soft 4-tone dither (DOS blue, BIOS, LITERAL LEGEND) or 1-bit bitmap (green, amber, paper) |
| [`parts/fonts`](parts/fonts/README.md) | VT323 everywhere; LITERAL LEGEND adds PixelOperator, Silkscreen, dogica |
| [`parts/build-and-docs`](parts/build-and-docs/README.md) | `node build.js` (pages) and `--single` (the one-file preview), README, change log, post guide, old-site inventory |

## Instruments (widgets)

| Area | What |
|---|---|
| [`widgets/conditions`](widgets/conditions/README.md) | Date, Moon phase, impact, and every planet's position, speed and direction |
| [`widgets/flight`](widgets/flight/README.md) | Upcoming exact moments (aspects, sign changes, stations, lunations) with countdowns |
| [`widgets/nextexact`](widgets/nextexact/README.md) | Countdown to the next exact event, filterable by kind |
| [`widgets/changelog`](widgets/changelog/README.md) | What changed since midnight or in the last N hours |
| [`widgets/since`](widgets/since/README.md) | What moved since this browser last visited (local storage only) |
| [`widgets/aspects`](widgets/aspects/README.md) | Every aspect in orb with exact and leave-orb times |
| [`widgets/moon`](widgets/moon/README.md) | The Moon: phase, sign, void of course |
| [`widgets/clock`](widgets/clock/README.md) | Planetary day and hour for a chosen city |
| [`widgets/speed`](widgets/speed/README.md) | How fast each planet is moving against its usual range |
| [`widgets/status`](widgets/status/README.md) | The playful system-status page: operational, station warning, out of bounds, high activity |
| [`widgets/diff`](widgets/diff/README.md) | Two moments side by side |
| [`widgets/scrub`](widgets/scrub/README.md) | Freeze every panel at another moment (+/- 30 days) |
| [`widgets/share`](widgets/share/README.md) | Shareable ASCII 3-day forecast, general sky or by rising sign |
| [`widgets/personal`](widgets/personal/README.md) | The sky now against your own birth chart (stored in this browser) |
| [`widgets/strip`](widgets/strip/README.md) | One-glance sky summary under the header |
| [`widgets/mini`](widgets/mini/README.md) | Moon, retrograde planets, impact and next exact in the rail |
| [`widgets/radar`](widgets/radar/README.md) | Wheel of upcoming and active aspects with pressure |
| [`widgets/activity`](widgets/activity/README.md) | Impact index graph with what is driving it |
| [`widgets/seismo`](widgets/seismo/README.md) | When each configuration builds, peaks and fades |
| [`widgets/traffic`](widgets/traffic/README.md) | Which hours of the day are crowded with events |
| [`widgets/skylink`](widgets/skylink/README.md) | Evergreen card: topic planet, closest phenomenon, link your own chart |
