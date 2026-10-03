/* ═══════════════════════════════════════════════════════════
   THEME + CONSOLE
   - themes: dos (blue), bios (grey), phosphor (green), amber, paper     -> <html data-theme>
   - CRT scanlines on/off, art mode bitmap/ascii                         -> localStorage, per visitor
   - the C:\> console: type "help"
   The tiny inline script in each <head> applies the saved theme before first paint.
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var THEMES = [['dos', 'DOS'], ['bios', 'BIOS'], ['phosphor', 'GREEN'], ['amber', 'AMBER'], ['paper', 'PAPER']];
  var PAGES = { home: 'index.html', index: 'index.html', sky: 'sky.html', about: 'about.html' };
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }

  function setTheme(t) {
    if (!THEMES.some(function (x) { return x[0] === t; })) return false;
    root.setAttribute('data-theme', t); set('nws-theme', t); sync(); window.dispatchEvent(new Event('themechange')); return true;
  }
  function setCrt(on) { root.classList.toggle('crt', on); root.classList.toggle('flicker', on); set('nws-crt', on ? '1' : '0'); sync(); }
  function setArt(m) { set('nws-art', m); sync(); window.dispatchEvent(new Event('artmode')); }

  /* ── dock ── */
  var dock = doc.createElement('div'); dock.className = 'dock'; dock.setAttribute('role', 'toolbar'); dock.setAttribute('aria-label', 'Display settings');
  THEMES.forEach(function (t) { var b = doc.createElement('button'); b.type = 'button'; b.textContent = t[1]; b.setAttribute('data-theme-btn', t[0]); b.onclick = function () { setTheme(t[0]); }; dock.appendChild(b); });
  var crtB = doc.createElement('button'); crtB.type = 'button'; crtB.onclick = function () { setCrt(!root.classList.contains('crt')); }; dock.appendChild(crtB);
  var artB = doc.createElement('button'); artB.type = 'button'; artB.onclick = function () { setArt(get('nws-art', 'bitmap') === 'ascii' ? 'bitmap' : 'ascii'); }; dock.appendChild(artB);
  function sync() {
    var cur = root.getAttribute('data-theme') || 'dos';
    Array.prototype.forEach.call(dock.querySelectorAll('[data-theme-btn]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-theme-btn') === cur); });
    var crt = root.classList.contains('crt'); crtB.textContent = 'CRT ' + (crt ? 'ON' : 'OFF'); crtB.setAttribute('aria-pressed', crt);
    artB.textContent = 'ART ' + (get('nws-art', 'bitmap') === 'ascii' ? 'ASCII' : 'BITMAP'); artB.setAttribute('aria-pressed', 'false');
  }

  /* ── title bar clock ── */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var d = new Date(), el = doc.getElementById('tb-clock'); if (!el) return;
    el.textContent = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  /* ── console ── */
  function initConsole() {
    var box = doc.getElementById('console'); if (!box) return;
    var out = box.querySelector('.out'), form = box.querySelector('form'), input = box.querySelector('input'), hist = [], hi = -1;
    function print(s, cls) { var d = doc.createElement('div'); if (cls) d.className = cls; d.textContent = s; out.appendChild(d); out.scrollTop = out.scrollHeight; }
    var CMDS = {
      help: function () { return ['HELP            this list', 'DIR             list pages', 'CD <page>       go to a page (home, sky, about)', 'THEME <name>    dos | bios | green | amber | paper', 'CRT ON|OFF      scanlines', 'ART BITMAP|ASCII  how pictures are drawn', 'SKY             one-line sky report', 'DATE / VER / CLS']; },
      dir: function () { return [' Volume in drive C is NWS', ' Directory of C:\\', '', 'INDEX    HTM     home', 'SKY      HTM     live instruments', 'ABOUT    HTM     about me', '         3 file(s)']; },
      ver: function () { return ['NWS-DOS [Version 1.0]  (c) me 2024-2026']; },
      date: function () { return [new Date().toString()]; },
      cls: function () { out.innerHTML = ''; return []; }, clear: function () { out.innerHTML = ''; return []; },
      sky: function () {
        var S = window.AstroSky; if (!S) return ['SKY ENGINE NOT LOADED'];
        var t = Date.now(), p = S.positions(t, { dec: false }), m = p[1], ph = S.moonPhase(t), rx = p.filter(function (x) { return x.retro; }).map(function (x) { return x.name.toUpperCase(); });
        return ['MOON ' + m.deg + ' DEG ' + m.signName.toUpperCase() + '  ' + ph.name.toUpperCase() + ' ' + Math.round(ph.illum * 100) + '%', 'RETROGRADE: ' + (rx.join(', ') || 'NONE'), 'IMPACT: ' + S.activity(t).value + '/100'];
      },
      theme: function (a) {
        var n = (a[0] || '').toLowerCase(); if (n === 'green') n = 'phosphor';
        if (!n) return ['CURRENT: ' + (root.getAttribute('data-theme') || 'dos'), 'USE: THEME dos|bios|green|amber|paper'];
        return setTheme(n) ? ['THEME SET: ' + n.toUpperCase()] : ['BAD THEME: ' + a[0]];
      },
      crt: function (a) { var on = (a[0] || '').toLowerCase(); if (on !== 'on' && on !== 'off') return ['USE: CRT ON|OFF']; setCrt(on === 'on'); return ['CRT ' + on.toUpperCase()]; },
      art: function (a) { var m = (a[0] || '').toLowerCase(); if (m !== 'bitmap' && m !== 'ascii') return ['USE: ART BITMAP|ASCII']; setArt(m); return ['ART ' + m.toUpperCase()]; },
      cd: function (a) {
        var k = (a[0] || '').toLowerCase().replace(/\.htm.?$/, '').replace(/[\\/]/g, '');
        if (!k || k === '..') k = 'home';
        if (!PAGES[k]) return ['PATH NOT FOUND: ' + (a[0] || '')];
        setTimeout(function () { location.href = PAGES[k]; }, 250); return ['LOADING ' + k.toUpperCase() + ' ...'];
      }
    };
    CMDS.goto = CMDS.cd; CMDS.dos = function () { return CMDS.theme(['dos']); }; CMDS.bios = function () { return CMDS.theme(['bios']); };
    CMDS.green = function () { return CMDS.theme(['green']); }; CMDS.amber = function () { return CMDS.theme(['amber']); }; CMDS.paper = function () { return CMDS.theme(['paper']); };
    CMDS['?'] = CMDS.help;
    print('NWS-DOS [Version 1.0]'); print('Type HELP for commands.');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var line = input.value.trim(); input.value = ''; if (!line) return;
      hist.unshift(line); hi = -1; print('C:\\> ' + line, 'cmd');
      var parts = line.split(/\s+/), c = parts.shift().toLowerCase(), fn = CMDS[c];
      (fn ? fn(parts) : ['Bad command or file name']).forEach(function (l) { print(l); });
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' && hist.length) { hi = Math.min(hist.length - 1, hi + 1); input.value = hist[hi]; e.preventDefault(); }
      else if (e.key === 'ArrowDown') { hi = Math.max(-1, hi - 1); input.value = hi < 0 ? '' : hist[hi]; e.preventDefault(); }
    });
  }

  function init() {
    root.classList.toggle('crt', get('nws-crt', '1') === '1'); root.classList.toggle('flicker', get('nws-crt', '1') === '1');
    doc.body.appendChild(dock); sync(); tick(); setInterval(tick, 1000); initConsole();
  }
  window.Nws = { setTheme: setTheme, setCrt: setCrt, setArt: setArt };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
