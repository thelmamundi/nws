# What the old site (`ws`, Weathergirl 98) has, and where it is in `nws`

Status: **ported** = in nws now; **changed** = in nws but different; **not yet** = only in ws.

| Feature (ws) | nws |
|---|---|
| ON AIR transit ticker | ported |
| Left rail: Navigation, Sky Now, Visit Counter, badges | ported (nav restyled; STARS toggle replaced by the CRT/GLOW badge) |
| Start menu, taskbar, minimizable windows | ported |
| Page header: eyebrow chips, big title, mast chips, live ASCII planet | ported (title colour per scheme) |
| PUBLIC SKY status strip | ported |
| Dithered starfield | changed: shows on void green and void amber only, tinted |
| Instruments: Current Conditions, Flight Board, Next Exact, Since Your Last Visit, Current Aspects, Radar, Impact Forecast, Seismograph, Traffic, Time Control, Changelog, Lunar Monitor, Planetary Clock, Speedometer, System Status, Compare Sky, Personal Aspects | ported (members gate removed, everything open) |
| 3-day forecast card (general sky) | ported on home |
| My Weather page (rising-sign forecast, Deep Forecast) | not yet |
| Birth details page and member birth API | not yet (a local-only form exists in Personal Aspects and Sky Link) |
| Members gate (paid / signed-in) and lock cards | not yet (Ghost feature) |
| Post screen: teletext tied to the post topic | changed: replaced by the Sky Link card |
| "Applied to you" post widget | changed: now the second Sky Link card |
| Dithered post thumbnails (`img.dither`) | ported (art.js) |
| Home "Latest" tiles and Archive rows | changed: static placeholders |
| Mailing list, guestbook, RSS | not yet |
| Resources hub (resources.json) | not yet |
| Book / readings flow, book nudge, "Book an analysis" card | not yet |
| Share buttons, OG share cards, live OG server | not yet |
| SigiLoader intro and sigils | not yet |
| Pixel glyph set | ported |
| Ghost templates (post, tag, error, page) | not yet (static pages instead) |
| Look switch Void / Paper | changed: now six schemes |
| Nav "Show / Coming soon / Hidden" switches | changed: edit `src/partials/layout.html` |

Everything in the old site is in the `ws` repo under `themes/weathergirl-98` and `docs/`.
