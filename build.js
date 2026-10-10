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
  if (/^post(-|$)/.test(page)) body = body.replace('<header class="doc-header', '<header class="doc-header doc-article');   /* article pages: Super VCR Mono title */
  const mast = home ? '' : `<header class="masthead"><div class="masthead-main"><a href="index.html" class="wordart"><span class="wordart-glyph aw-day-glyph" aria-hidden="true"></span> NWS</a><p class="tagline">The sky, live, in your time zone.</p></div></header>`;
  const html = layout.replace('{{content}}', body).replace('{{masthead}}', mast)
    .replace(/\{\{title\}\}/g, m[1]).replace(/\{\{description\}\}/g, m[2])
    .replace(/\{\{here:(\w+)\}\}/g, (_, k) => (k === page || (k === 'posts' && page.indexOf('post') === 0)) ? ' is-current' : '').replace(/\{\{open:(\w+)\}\}/g, (_, k) => k === page ? ' open' : '');
  fs.writeFileSync(path.join(__dirname, page + '.html'), html);
  console.log('built', page + '.html');
}

/* ── full-screen dashboard (one self-contained html: host it, or use it as a Wallpaper Engine web wallpaper):  node build.js --dashboard  ->  dashboard.html + wallpaper/ ── */
if (process.argv.includes('--dashboard')) {
  const ALL = [['conditions', 'Current Conditions', '&#9737;&#65038;', 'compact'], ['nextexact', 'Next Exact Thing', '&#9201;&#65038;', ''], ['flight', 'Celestial Flight Board', '&#9992;&#65038;', 'compact'], ['chartnow', 'Current Sky Chart', '&#9737;&#65038;', ''],
    ['moon', 'Lunar Motion Monitor', '&#9790;&#65038;', ''], ['clock', 'Planetary Clock', '&#9201;&#65038;', ''], ['personal', 'Your Active Personal Aspects', '&#9733;&#65038;', ''], ['charttransit', 'Transit Chart', '&#9678;', ''],
    ['radar', 'Astrological Weather Radar', '&#9678;', 'window=24'], ['activity', 'Impact Forecast', '&#9650;&#65038;', ''], ['aspects', 'Current Aspects', '&#9678;', ''], ['speed', 'Planet Speedometer', '&#9201;&#65038;', ''],
    ['status', 'Celestial System Status', '&#9881;&#65038;', ''], ['scrub', 'Time Control', '&#9201;&#65038;', ''], ['changelog', 'Sky Changelog', '&#9998;&#65038;', ''], ['since', 'Since Your Last Visit', '&#8635;', 'home']];
  const MIME = { gif: 'image/gif', png: 'image/png', ttf: 'font/ttf', woff2: 'font/woff2', otf: 'font/otf' };
  const inl = (txt) => txt.replace(/url\((["']?)(?:\.\.\/|assets\/)((?:img\/ll|fonts)\/[\w.-]+\.(?:gif|png|ttf|woff2|otf))\1\)/g, (m, q, f) => `url(data:${MIME[f.split('.').pop()]};base64,${fs.readFileSync(path.join(__dirname, 'assets', f)).toString('base64')})`);
  const css = inl(['legacy', 'dos-skin'].map(n => R('assets/css', n + '.css')).join('\n')) + '\n' + R('src/newtab/dashboard.css');
  const boot = R('src/newtab/boot.js'), js = ['pixel-glyphs', 'chart-wheel', 'starfield', 'astro-engine', 'ascii-art', 'art', 'widgets', 'site', 'theme'].map(n => R('assets/js', n + '.js')).concat([R('src/newtab/dashboard.js')]).map(s => `<script>\n${s}\n</script>`).join('\n');
  const head = `<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Symbols+2&display=swap" rel="stylesheet">\n<style>\n${css}\n</style>\n<script>${boot}</script>`;
  const html = R('src/newtab/dashboard.html').replace('{{head}}', () => head).replace('{{widgets}}', () => ALL.map(g => widget({ name: g[0], title: g[1], ico: g[2], opts: g[3] })).join('\n')).replace('{{scripts}}', () => js);
  fs.writeFileSync(path.join(__dirname, 'dashboard.html'), html);
  fs.mkdirSync(path.join(__dirname, 'wallpaper'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'wallpaper/index.html'), html);
  fs.writeFileSync(path.join(__dirname, 'wallpaper/project.json'), JSON.stringify({ file: 'index.html', title: 'NWS Sky Dashboard', type: 'web', description: 'Every gadget of the sky, live.', tags: ['Abstract'], preview: 'preview.jpg' }, null, 2) + '\n');
  console.log('dashboard -> dashboard.html, wallpaper/ (index.html + project.json)');
}

/* ── stream overlay (OBS browser source, 1920x1080, transparent live scene):  node build.js --overlay  ->  overlay.html ── */
if (process.argv.includes('--overlay')) {
  const wd = (n, t, ico, o) => widget({ name: n, title: t, ico, opts: o });
  const MIME = { gif: 'image/gif', png: 'image/png', ttf: 'font/ttf', woff2: 'font/woff2', otf: 'font/otf' };
  const inl = (txt) => txt.replace(/url\((["']?)(?:\.\.\/|assets\/)((?:img\/ll|fonts)\/[\w.-]+\.(?:gif|png|ttf|woff2|otf))\1\)/g, (m, q, f) => `url(data:${MIME[f.split('.').pop()]};base64,${fs.readFileSync(path.join(__dirname, 'assets', f)).toString('base64')})`);
  const css = inl(['legacy', 'dos-skin'].map(n => R('assets/css', n + '.css')).join('\n')) + '\n' + R('src/newtab/overlay.css');
  const js = ['pixel-glyphs', 'chart-wheel', 'starfield', 'astro-engine', 'ascii-art', 'art', 'widgets', 'site', 'theme'].map(n => R('assets/js', n + '.js')).concat([R('src/newtab/overlay.js')]).map(s => `<script>\n${s}\n</script>`).join('\n');
  const head = `<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Symbols+2&display=swap" rel="stylesheet">\n<style>\n${css}\n</style>\n<script>${R('src/newtab/boot.js')}</script>`;
  const left = [wd('conditions', 'Current Conditions', '&#9737;&#65038;', 'compact'), wd('nextexact', 'Next Exact Thing', '&#9201;&#65038;', '')].join('\n');
  const right = [wd('chartnow', 'Current Sky Chart', '&#9737;&#65038;', ''), wd('moon', 'Lunar Motion Monitor', '&#9790;&#65038;', '')].join('\n');
  const html = R('src/newtab/overlay.html').replace('{{head}}', () => head).replace('{{left}}', () => left).replace('{{right}}', () => right).replace('{{wheel}}', () => wd('chartnow', 'Current Sky Chart', '&#9737;&#65038;', '')).replace('{{scripts}}', () => js);
  fs.writeFileSync(path.join(__dirname, 'overlay.html'), html);
  console.log('overlay -> overlay.html');
}

/* ── YouTube kit (intro, end screen, title card, lower third, bug, thumbnail):  node build.js --youtube  ->  youtube.html (render files with scripts/render-youtube.js) ── */
if (process.argv.includes('--youtube')) {
  const MIME = { gif: 'image/gif', png: 'image/png', ttf: 'font/ttf', woff2: 'font/woff2', otf: 'font/otf' };
  const inl = (txt) => txt.replace(/url\((["']?)(?:\.\.\/|assets\/)((?:img\/ll|fonts)\/[\w.-]+\.(?:gif|png|ttf|woff2|otf))\1\)/g, (m, q, f) => `url(data:${MIME[f.split('.').pop()]};base64,${fs.readFileSync(path.join(__dirname, 'assets', f)).toString('base64')})`);
  const css = inl(['legacy', 'dos-skin'].map(n => R('assets/css', n + '.css')).join('\n')) + '\n' + R('src/newtab/youtube.css');
  const js = ['pixel-glyphs', 'chart-wheel', 'astro-engine', 'planet-art', 'ascii-art', 'theme'].map(n => R('assets/js', n + '.js')).concat([R('src/newtab/youtube.js')]).map(s => `<script>\n${s}\n</script>`).join('\n');
  const head = `<style>\n${css}\n</style>\n<script>${R('src/newtab/boot.js')}</script>`;
  fs.writeFileSync(path.join(__dirname, 'youtube.html'), R('src/newtab/youtube.html').replace('{{head}}', () => head).replace('{{scripts}}', () => js));
  console.log('youtube -> youtube.html');
}

/* ── new-tab extension (Chrome / Edge / Brave, Manifest V3):  node build.js --extension  ->  extension/  (load it unpacked) ── */
if (process.argv.includes('--extension')) {
  const GADGETS = [
    ['conditions', 'Current Conditions', '&#9737;&#65038;', 'compact', 1], ['nextexact', 'Next Exact Thing', '&#9201;&#65038;', '', 1], ['flight', 'Celestial Flight Board', '&#9992;&#65038;', 'compact', 1],
    ['chartnow', 'Current Sky Chart', '&#9737;&#65038;', '', 1], ['moon', 'Lunar Motion Monitor', '&#9790;&#65038;', '', 1], ['clock', 'Planetary Clock', '&#9201;&#65038;', '', 1],
    ['personal', 'Your Active Personal Aspects', '&#9733;&#65038;', '', 1], ['charttransit', 'Transit Chart', '&#9678;', '', 0], ['radar', 'Astrological Weather Radar', '&#9678;', 'window=24', 0],
    ['activity', 'Impact Forecast', '&#9650;&#65038;', '', 0], ['aspects', 'Current Aspects', '&#9678;', '', 0], ['speed', 'Planet Speedometer', '&#9201;&#65038;', '', 0],
    ['status', 'Celestial System Status', '&#9881;&#65038;', '', 0], ['scrub', 'Time Control', '&#9201;&#65038;', '', 0], ['changelog', 'Sky Changelog', '&#9998;&#65038;', '', 0], ['since', 'Since Your Last Visit', '&#8635;', 'home', 0]
  ];
  const dir = path.join(__dirname, 'extension'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(path.join(dir, 'assets/js'), { recursive: true });
  const tpl = R('src/newtab/newtab.html')
    .replace('{{picker}}', GADGETS.map(g => `<label><input type="checkbox" value="${g[0]}"> ${g[1]}</label>`).join('\n'))
    .replace('{{widgets}}', GADGETS.map(g => widget({ name: g[0], title: g[1], ico: g[2], opts: g[3] }).replace('<section ', `<section data-default="${g[4]}" `)).join('\n'));
  fs.writeFileSync(path.join(dir, 'newtab.html'), tpl);
  ['boot.js', 'newtab.js', 'newtab.css'].forEach(f => fs.copyFileSync(path.join(__dirname, 'src/newtab', f), path.join(dir, f)));
  for (const f of ['legacy', 'dos-skin']) { fs.mkdirSync(path.join(dir, 'assets/css'), { recursive: true }); fs.copyFileSync(path.join(__dirname, 'assets/css', f + '.css'), path.join(dir, 'assets/css', f + '.css')); }
  for (const f of ['pixel-glyphs', 'chart-wheel', 'starfield', 'astro-engine', 'ascii-art', 'art', 'widgets', 'site', 'theme']) fs.copyFileSync(path.join(__dirname, 'assets/js', f + '.js'), path.join(dir, 'assets/js', f + '.js'));
  for (const d of ['fonts', 'img']) fs.cpSync(path.join(__dirname, 'assets', d), path.join(dir, 'assets', d), { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'NWS New Tab', version: '0.1.0', description: 'The sky, live, on every new tab.', chrome_url_overrides: { newtab: 'newtab.html' }, permissions: [] }, null, 2) + '\n');
  const ff = path.join(__dirname, 'extension-firefox'); fs.rmSync(ff, { recursive: true, force: true }); fs.cpSync(dir, ff, { recursive: true });
  const mf = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')); mf.browser_specific_settings = { gecko: { id: 'newtab@nws.local', strict_min_version: '115.0' } };
  fs.writeFileSync(path.join(ff, 'manifest.json'), JSON.stringify(mf, null, 2) + '\n');
  console.log('extension -> extension/ (Chrome, Edge, Brave: chrome://extensions > Developer mode > Load unpacked)');
  console.log('extension-firefox/ (Firefox: about:debugging > This Firefox > Load Temporary Add-on > pick its manifest.json)');
}

/* ── single-file build for previewing in one document (all pages as tabs, everything inlined):  node build.js --single out.html ── */
if (process.argv.includes('--single')) {
  const out = process.argv[process.argv.indexOf('--single') + 1];
  const pages = ['index'].concat(fs.readdirSync(path.join(__dirname, 'src/pages')).map(f => f.replace(/\.html$/, '')).filter(n => n !== 'index').sort()), cut = (h, a, b) => h.slice(h.indexOf(a) + a.length, h.indexOf(b));
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
  body = body.replace(/\{\{[^}]*\}\}/g, '').replace(new RegExp('href="(' + pages.join('|') + ')\\.html(#\\w+)?"', 'g'), (m, p, h) => `href="#${p === 'index' ? 'home' : p}"`);
  const MIME = { gif: 'image/gif', png: 'image/png', ttf: 'font/ttf', woff2: 'font/woff2', otf: 'font/otf' };
  const inline = (txt) => txt.replace(/url\((["']?)(?:\.\.\/|assets\/)((?:img\/ll|fonts)\/[\w.-]+\.(?:gif|png|ttf|woff2|otf))\1\)/g, (m, q, f) =>
    `url(data:${MIME[f.split('.').pop()]};base64,${fs.readFileSync(path.join(__dirname, 'assets', f)).toString('base64')})`);
  const css = inline(['legacy', 'dos-skin'].map(n => R('assets/css', n + '.css')).join('\n'));
  body = inline(body);
  const js = ['pixel-glyphs', 'chart-wheel', 'starfield', 'astro-engine', 'ascii-art', 'art', 'widgets', 'site', 'sky-topic', 'hero-art', 'theme', 'console'].map(n => `<script>\n${R('assets/js', n + '.js')}\n</script>`).join('\n');
  const nav = `<script>try{var t=localStorage.getItem('nws-theme');if(t)document.documentElement.setAttribute('data-theme',t);if(localStorage.getItem('nws-crt')==='1')document.documentElement.className+=' crt';if(localStorage.getItem('nws-glow')==='1')document.documentElement.className+=' glow'}catch(e){}</script><script>(function(){function show(){var h=(location.hash||'#home').slice(1);if(!document.querySelector('[data-pg="'+h+'"]'))h='home';[].forEach.call(document.querySelectorAll(".npage"),function(e){e.hidden=e.getAttribute('data-pg')!==h});window.scrollTo(0,0);setTimeout(function(){window.dispatchEvent(new Event('resize'))},50)}window.addEventListener('hashchange',show);show();})();</script>`;
  fs.writeFileSync(out, `<title>NWS</title>\n<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Symbols+2&display=swap" rel="stylesheet">\n<style>\n${css}\nhtml{padding:0!important}\n</style>\n<body data-ticker="Normal">${body}\n${js}\n${nav}`.replace('<body data-ticker="Normal"><body', '<body'));
  console.log('single ->', out);
}
