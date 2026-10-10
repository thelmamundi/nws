# New Tab dashboard (extension)
Source: `src/newtab/` (newtab.html template, newtab.js, newtab.css, boot.js). Build: `node build.js --extension` writes `extension/` (load unpacked in Chrome, Edge or Brave).
Gadget list and defaults: the `GADGETS` array in the extension block of `build.js`. Widgets are the same `W.*` renderers as the site (`assets/js/widgets.js`).
