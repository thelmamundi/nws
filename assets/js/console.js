/* The C:\> console in the sidebar. Type "help". */
(function () {
  'use strict';
  var doc = document, box = doc.getElementById('console'); if (!box) return;
  var out = box.querySelector('.out'), form = box.querySelector('form'), input = box.querySelector('input'), hist = [], hi = -1;
  var PAGES = { home: 'index.html', weather: 'weather.html', sky: 'sky.html', charts: 'charts.html', lab: 'lab.html', post: 'post.html', posts: 'posts.html', about: 'about.html' };
  function print(s, cls) { var d = doc.createElement('div'); if (cls) d.className = cls; d.textContent = s; out.appendChild(d); out.scrollTop = out.scrollHeight; }
  var C = {
    help: function () { return ['HELP        this list', 'DIR         list pages', 'CD <page>    home | weather | sky | charts | lab | posts | about', 'CAL [yyyy-mm] astro calendar in the Console Lab', 'FIGLET [-f font] <text>   big letters', 'FONTS [filter] list FIGlet fonts', 'SKY         one-line sky report', 'CRT ON|OFF  scanlines   GLOW ON|OFF  void glow', 'THEME <name> dos | bios | green | amber | paper | literal', 'DATE  VER  CLS']; },
    dir: function () { return [' Volume in drive C is NWS', ' Directory of C:\\', '', 'INDEX    HTM   home', 'WEATHER  HTM   weather radar', 'SKY      HTM   sky desk', 'CHARTS   HTM   chart wheels', 'LAB      HTM   console lab (ascii astro calendar)', 'POSTS    HTM   hot takes (6 articles)', 'ABOUT    HTM   about me', '         7 file(s)']; },
    ver: function () { return ['NWS-DOS [Version 2.0]']; },
    date: function () { return [new Date().toString()]; },
    cls: function () { out.innerHTML = ''; return []; },
    sky: function () {
      var S = window.AstroSky; if (!S) return ['SKY ENGINE NOT LOADED'];
      var t = Date.now(), p = S.positions(t, { dec: false }), m = p[1], ph = S.moonPhase(t), rx = p.filter(function (x) { return x.retro; }).map(function (x) { return x.name.toUpperCase(); });
      return ['MOON ' + m.deg + ' DEG ' + m.signName.toUpperCase() + '  ' + ph.name.toUpperCase() + ' ' + Math.round(ph.illum * 100) + '%', 'RETROGRADE: ' + (rx.join(', ') || 'NONE'), 'IMPACT: ' + S.activity(t).value + '/100'];
    },
    theme: function (a) {
      var n = (a[0] || '').toLowerCase(); if (!n) return ['USE: THEME dos|bios|green|amber|paper|literal'];
      return window.Nws && window.Nws.setTheme(n) ? ['COLOR SCHEME: ' + n.toUpperCase()] : ['BAD SCHEME: ' + a[0]];
    },
    crt: function (a) { var v = (a[0] || '').toLowerCase(); if (v !== 'on' && v !== 'off') return ['USE: CRT ON|OFF']; window.Nws.setFx('crt', v === 'on'); return ['CRT ' + v.toUpperCase()]; },
    glow: function (a) { var v = (a[0] || '').toLowerCase(); if (v !== 'on' && v !== 'off') return ['USE: GLOW ON|OFF']; window.Nws.setFx('glow', v === 'on'); return ['GLOW ' + v.toUpperCase() + ' (void green and void amber)']; },
    cd: function (a) {
      var k = (a[0] || '').toLowerCase().replace(/\.htm.?$/, '').replace(/[\\/]/g, ''); if (!k || k === '..') k = 'home';
      if (!PAGES[k]) return ['PATH NOT FOUND: ' + (a[0] || '')];
      setTimeout(function () { location.href = PAGES[k]; }, 250); return ['LOADING ' + k.toUpperCase() + ' ...'];
    }
  };
  C.cal = function (a) {
    var m = /^(\d{4})-(\d{1,2})$/.exec(a[0] || ''), h = m ? '#' + m[1] + '-' + (m[2].length < 2 ? '0' : '') + m[2] : '';
    if (a[0] && !m) return ['USE: CAL or CAL 2026-11'];
    setTimeout(function () { location.href = PAGES.lab + h; }, 250); return ['LOADING CONSOLE LAB ' + (h.slice(1) || 'THIS MONTH') + ' ...'];
  };
  function withFonts(run) {                                          /* NwsFiglet loads 332 fonts on first use (lab-calendar.js) */
    var F = window.NwsFiglet; if (!F) return ['FIGLET NOT LOADED'];
    print('LOADING FONTS ...');
    F.ready().then(function () { run(F).forEach(function (l) { print(l.text || l, l.cls); }); }, function (e) { print('FONTS DID NOT LOAD: ' + e.message); });
    return [];
  }
  C.figlet = function (a) {
    var font = 'Small', i = a.indexOf('-f');
    if (i >= 0) { font = a[i + 1] || font; a.splice(i, 2); }
    var text = a.join(' '); if (!text) return ['USE: FIGLET [-f font] <text>   (fonts with spaces: use _ , e.g. -f ANSI_Shadow)'];
    return withFonts(function (F) {
      var want = font.replace(/_/g, ' ').toLowerCase(), hit = F.fonts().filter(function (n) { return n.toLowerCase() === want; })[0];
      if (!hit) return ['NO FONT: ' + font + '  (type FONTS)'];
      return [{ text: F.text(text, hit, 60).join('\n'), cls: 'pre' }];
    });
  };
  C.fonts = function (a) {
    var f = (a.join(' ') || '').toLowerCase();
    return withFonts(function (F) { var n = F.fonts().filter(function (x) { return !f || x.toLowerCase().indexOf(f) >= 0; }); return [n.join(', '), n.length + ' FONT(S)']; });
  };
  C.banner = C.figlet;
  C.clear = C.cls; C['?'] = C.help; C.goto = C.cd;
  print('NWS-DOS [Version 2.0]'); print('Type HELP for commands.');
  form.addEventListener('submit', function (e) {
    e.preventDefault(); var line = input.value.trim(); input.value = ''; if (!line) return;
    hist.unshift(line); hi = -1; print('C:\\> ' + line, 'cmd');
    var parts = line.split(/\s+/), fn = C[parts.shift().toLowerCase()];
    (fn ? fn(parts) : ['Bad command or file name']).forEach(function (l) { print(l); });
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' && hist.length) { hi = Math.min(hist.length - 1, hi + 1); input.value = hist[hi]; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { hi = Math.max(-1, hi - 1); input.value = hi < 0 ? '' : hist[hi]; e.preventDefault(); }
  });
})();
