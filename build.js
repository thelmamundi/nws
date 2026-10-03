/* Static page builder: src/pages/*.html inside src/partials/layout.html -> ./*.html (committed, so any static host works).
   Macros in pages: {{hero ...}} {{widget ...}} {{banner}}.   usage: node build.js */
const fs = require('fs'), path = require('path');
const R = (...p) => fs.readFileSync(path.join(__dirname, ...p), 'utf8');
const layout = R('src/partials/layout.html');
function attrs(s) { const o = {}; s.replace(/(\w+)="([^"]*)"|(\w+)/g, (m, k, v, flag) => { if (k) o[k] = v; else o[flag] = true; return m; }); return o; }
const BANNER = (() => {
  const N = ['█   █', '██  █', '█ █ █', '█  ██', '█   █'], W = ['█   █', '█   █', '█ █ █', '██ ██', '█   █'], S = [' ████', '█    ', ' ███ ', '    █', '████ '];
  return [0, 1, 2, 3, 4].map(i => [N, W, S].map(x => x[i]).join('  ')).join('\n');
})();
function widget(a) {
  return `<section class="win win-widget" data-widget="${a.name}"${a.opts ? ` data-opts="${a.opts}"` : ''}>
  <div class="win-title"><span class="win-ico" aria-hidden="true">${a.ico || ''}</span><span class="win-name">${a.title}</span><span class="win-btns"><button type="button" class="wb-min" aria-label="Minimize ${a.title}">_</button></span></div>
  <div class="win-body">
    ${a.q ? `<p class="win-q">${a.q}</p>` : ''}
    <div class="widget-body" data-body><noscript>This panel is computed live in your browser, so it needs JavaScript.</noscript><span class="loading">Calculating&hellip;</span></div>
  </div>
</section>`;
}
function hero(a) {
  return `<header class="doc-header${a.home ? ' home-header' : ''} has-art">
  <div class="hdr-text">
  <div class="doc-eyebrow"><span class="aw-day-glyph" aria-hidden="true"></span> <span class="chip" data-host>NWS</span> <span class="doc-eyebrow-tag">${a.eyebrow}</span></div>
  <h1 class="doc-title">${a.title}</h1>
  ${a.lead ? `<div class="doc-subtitle">${a.lead}</div>` : ''}
  ${a.mast ? `<div class="mast" id="mast">
    <span class="chip mast-chip"><span class="aw-day-glyph" id="mast-glyph" aria-hidden="true"></span></span>
    <span class="chip mast-chip" id="mast-date">&hellip;</span>
    <span class="chip mast-chip" id="mast-time">&hellip;</span>
    <span class="chip mast-chip mast-chip-dim" id="mast-label">Next up</span>
    <span class="chip mast-chip mast-chip-value" id="mast-value">&hellip;</span>
  </div>` : ''}
  ${a.intro ? R('src/partials', 'intro-' + a.intro + '.html') : ''}
  </div>
  <pre class="hero-art" data-ascii-art ${a.post ? `data-title="${a.title}" data-tags="${a.tags || ''}" data-excerpt="${a.lead || ''}"` : `data-art="${a.art || 'day'}"`} aria-hidden="true"></pre>
</header>`;
}
for (const f of fs.readdirSync(path.join(__dirname, 'src/pages'))) {
  const page = f.replace(/\.html$/, ''), src = R('src/pages', f), home = page === 'index';
  const m = /<!--meta title: (.*?) \| description: (.*?)( \| home)? -->/.exec(src);
  let body = src.replace(/<!--meta.*?-->\n?/, '')
    .replace(/\{\{hero ([^}]*)\}\}/g, (_, s) => hero(attrs(s)))
    .replace(/\{\{widget ([^}]*)\}\}/g, (_, s) => widget(attrs(s)))
    .replace(/\{\{banner\}\}/g, BANNER);
  const mast = home ? '' : `<header class="masthead"><div class="masthead-main"><a href="index.html" class="wordart"><span class="wordart-glyph aw-day-glyph" aria-hidden="true"></span> NWS</a><p class="tagline">The sky, live, in your time zone.</p></div></header>`;
  const html = layout.replace('{{content}}', body).replace('{{masthead}}', mast)
    .replace(/\{\{title\}\}/g, m[1]).replace(/\{\{description\}\}/g, m[2])
    .replace(/\{\{here:(\w+)\}\}/g, (_, k) => k === page ? ' is-current' : '').replace(/\{\{open:(\w+)\}\}/g, (_, k) => k === page ? ' open' : '');
  fs.writeFileSync(path.join(__dirname, page + '.html'), html);
  console.log('built', page + '.html');
}

/* ── single-file build for previewing in one document (all pages as tabs, everything inlined):  node build.js --single out.html ── */
if (process.argv.includes('--single')) {
  const out = process.argv[process.argv.indexOf('--single') + 1];
  const pages = ['index', 'weather', 'sky', 'post', 'about'], cut = (h, a, b) => h.slice(h.indexOf(a) + a.length, h.indexOf(b));
  const first = R('index.html');
  const mainOpen = '<main class="main" id="main">', pre = first.slice(first.indexOf('<body'), first.indexOf(mainOpen) + mainOpen.length);
  const ON = /<div class="onair" id="onair"[\s\S]*?<\/div><\/div>\n\s*<\/div>\n/;
  const onair = ON.exec(first)[0];
  let secs = pages.map(p => {
    let h = R(p + '.html'); if (p === 'index') h = h.replace(/<div class="mast" id="mast">[\s\S]*?<\/div>/, '');   /* ids must be unique in one document: the Sky tab owns the live chips */
    const m = cut(h, mainOpen, '</main>').replace(ON, '');
    return `<div class="npage" data-pg="${p === 'index' ? 'home' : p}" hidden>${m}</div>`;
  }).join('\n');
  const post = first.slice(first.indexOf('</main>'), first.indexOf('<script src='));
  let body = (pre + onair + secs + post).replace(/<body[^>]*>/, '');
  body = body.replace(/\{\{[^}]*\}\}/g, '').replace(/href="(index|weather|sky|post|about)\.html(#\w+)?"/g, (m, p, h) => `href="#${p === 'index' ? 'home' : p}"`);
  const MIME = { gif: 'image/gif', png: 'image/png', ttf: 'font/ttf', woff2: 'font/woff2', otf: 'font/otf' };
  const inline = (txt) => txt.replace(/url\((["']?)(?:\.\.\/|assets\/)((?:img\/ll|fonts)\/[\w.-]+\.(?:gif|png|ttf|woff2|otf))\1\)/g, (m, q, f) =>
    `url(data:${MIME[f.split('.').pop()]};base64,${fs.readFileSync(path.join(__dirname, 'assets', f)).toString('base64')})`);
  const css = inline(['legacy', 'dos-skin'].map(n => R('assets/css', n + '.css')).join('\n'));
  body = inline(body);
  const js = ['pixel-glyphs', 'starfield', 'astro-engine', 'ascii-art', 'art', 'widgets', 'site', 'sky-topic', 'hero-art', 'theme', 'console'].map(n => `<script>\n${R('assets/js', n + '.js')}\n</script>`).join('\n');
  const nav = `<script>try{var t=localStorage.getItem('nws-theme');if(t)document.documentElement.setAttribute('data-theme',t);if(localStorage.getItem('nws-crt')==='1')document.documentElement.className+=' crt';if(localStorage.getItem('nws-glow')==='1')document.documentElement.className+=' glow'}catch(e){}</script><script>(function(){function show(){var h=(location.hash||'#home').slice(1);if(!document.querySelector('[data-pg="'+h+'"]'))h='home';[].forEach.call(document.querySelectorAll(".npage"),function(e){e.hidden=e.getAttribute('data-pg')!==h});window.scrollTo(0,0);setTimeout(function(){window.dispatchEvent(new Event('resize'))},50)}window.addEventListener('hashchange',show);show();})();</script>`;
  fs.writeFileSync(out, `<title>NWS</title>\n<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Symbols+2&display=swap" rel="stylesheet">\n<style>\n${css}\nhtml{padding:0!important}\n</style>\n<body data-ticker="Normal">${body}\n${js}\n${nav}`.replace('<body data-ticker="Normal"><body', '<body'));
  console.log('single ->', out);
}
