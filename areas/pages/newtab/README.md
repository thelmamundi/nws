# New Tab dashboard (extension)
Source: `src/newtab/` (newtab.html template, newtab.js, newtab.css, boot.js). Build: `node build.js --extension` writes `extension/` (load unpacked in Chrome, Edge or Brave).
Gadget list and defaults: the `GADGETS` array in the extension block of `build.js`. Widgets are the same `W.*` renderers as the site (`assets/js/widgets.js`).

Dashboard: `node build.js --dashboard` writes `dashboard.html` and `wallpaper/` (src/newtab/dashboard.*).

Overlay: `node build.js --overlay` writes `overlay.html` (src/newtab/overlay.*).

YouTube kit: `node build.js --youtube`, then `node scripts/render-youtube.js` (src/newtab/youtube.*). Output in youtube/.

Over-the-shoulder: dashboard.html?bare&shoulder=left|right&only=name,name (see scripts/render-youtube.js).
