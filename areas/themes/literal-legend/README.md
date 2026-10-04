# LITERAL LEGEND

Black void with the tiled animated nebula, pink DOS windows (dithered title bars, buttons, shadows), pink + dark blue + light blue screens, pixel sparkle cursor, PixelOperator / Silkscreen / dogica fonts.

**Area:** `themes/literal-legend`

## Where it lives
- `assets/css/dos-skin.css`  (`legend` tokens, DITHER TILES, the LITERAL LEGEND block)
- `scripts/make-dither-tiles.py`  (regenerates the dither tiles)
- `assets/img/ll/`  (space.gif, bar.gif, rose.gif, clock2.gif, clock3.gif)
- `assets/fonts/`  (PixelOperator, Silkscreen, dogica)
- `assets/js/theme.js`  (sparkle trail)
- `assets/js/art.js`  (`mode()`: dither)

## Notes
To change the pinks or blues: edit the `legend` tokens, then the colour list in `scripts/make-dither-tiles.py`, run it, and paste its output between the DITHER TILES markers.

## Start a chat
Paste this into a new chat on the nws repo:

> In nws, area: themes/literal-legend. Read areas/themes/literal-legend/README.md and REQUESTS.md, make the changes, then log the round in docs/CHANGES.md.

Put your requests in `REQUESTS.md` in this folder first (or just type them in the chat).
