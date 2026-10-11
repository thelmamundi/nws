# Current Sky Chart (and the chart wheel renderer)

The sky now as a wheel. This area also owns the wheel renderer that the Transit Chart, the dashboard, the overlay and the YouTube kit use.

**Area:** `widgets/chartnow` (see also `widgets/charttransit`, `pages/charts`)

## Where it lives
- `assets/js/chart-wheel.js`: the renderer, `NwsChart.draw(canvas, { asc, outer, inner, aspects, clear })`, and the six SKINS
- `assets/js/widgets.js`: `W.chartnow`, `W.charttransit`, helpers `wheelPos`, `aspectsBetween`, `houseOf`, `chartShell`
- `assets/css/dos-skin.css`: `.chart-wrap`, `canvas.wheel`

## How it is drawn now (Round 16)
- Pixel buffer, 336 x 336 cells (1.5 px per cell on screen), painted per pixel in polar coordinates, scaled up crisp. No dither.
- The body is Win98 silver with 2-cell bevels lit from the top left (light `hi`, shade `lo`, dark outer line). The theme colour goes on the sign-ring segments (solid, one per element) and on aspect lines, markers and hub.
- Glyphs are 21 cells (32 px). Planet buttons 27 cells (single wheel) or 26 (bi-wheel). Sign glyphs at ring mid-radius. House numbers 3x5 digits drawn 2x2.
- Markers are spread apart by `spread()` so crowded planets do not overlap; a leader tick points to the true degree.
- Aspects: hard = solid, easy = dotted, under 1 degree = doubled. Conjunction colour per skin.
- `clear: true` leaves the area outside the wheel transparent (used by the YouTube kit).
- Houses are whole sign only; no Midheaven / Ascendant labels yet.

## Known gaps (ideas for a chart-focused chat)
- Positions come from `assets/js/astro-engine.js` (approximate Keplerian orbits, a few arcminutes for the Moon and inner planets, about 0.1 degree for Jupiter and Saturn). For client work it needs a real ephemeris (Swiss Ephemeris) and a check against Solar Fire.
- No Placidus / Koch / Equal houses, no angle labels (ASC, MC, DSC, IC), no cusp degrees, no retrograde glyph on the wheel markers beyond a small mark.
- Bi-wheel markers are tight at 32 px glyphs; a larger canvas or a smaller bi-wheel glyph size may be needed.
- Not yet: progressions, solar return, synastry, aspect-orb settings, Part of Fortune and other points, chart-type switcher, PNG / PDF export.
- Per-theme chart looks: dos (teal desk, white well), bios, phosphor, amber, paper, legend. Tune in `SKINS` in `chart-wheel.js`.

## Start a chat
> In nws, area: widgets/chartnow. Read areas/widgets/chartnow/README.md, make the changes, then log the round in docs/CHANGES.md.
