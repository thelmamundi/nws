/* Every frame is a function of ?t= (seconds).  Page parameters:
   kind=intro|end|card|lower|bug|thumb   t=1.5   theme=legend|dos|bios|phosphor|amber|paper   title=...  sub=...  glyph=venus  num=02 (card chapter)  at=<epoch ms for the sky>
   window.ytDuration -> length in seconds, window.setT(t) draws that frame (the renderer calls it). */
(function () {
  'use strict';
  var q = new URLSearchParams(location.search), root = document.documentElement, S = window.AstroSky, PG = window.PixelGlyphs;
  var kind = q.get('kind') || 'intro', theme = q.get('theme') || 'legend', title = q.get('title') || 'The sky, live', sub = q.get('sub') || '', num = q.get('num') || '01';
  var at = +q.get('at') || Date.now(), W = kind === 'thumb' ? 1280 : 1920, H = kind === 'thumb' ? 720 : 1080;
  var stage = document.getElementById('stage'), dz = document.getElementById('dz'), dctx = dz.getContext('2d');
  root.setAttribute('data-kind', kind); if (kind === 'lower' || kind === 'bug') root.setAttribute('data-clear', '1');
  if (window.Nws) window.Nws.setTheme(theme);
  var DUR = { intro: 6, end: 20, card: 2.5, lower: 6, bug: 1, thumb: 1 }; window.ytDuration = DUR[kind] || 1;
  var NAMES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'], DAYG = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
  var gname = q.get('glyph') || DAYG[new Date(at).getDay()];
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function ease(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function step(x, n) { return Math.round(clamp(x, 0, 1) * n) / n; }
  function glyph(n, px) { return '<span class="yt-glyph" style="width:' + px + 'px;height:' + px + 'px">' + PG.svg(n) + '</span>'; }
  function win(id, x, y, w, h, name, body, cls) { return '<section class="win ' + (cls || '') + '" id="' + id + '" style="left:' + x + 'px;top:' + y + 'px;width:' + (w ? w + 'px' : 'max-content') + ';' + (h ? 'height:' + h + 'px;' : '') + '"><div class="win-title"><span class="win-name">' + name + '</span></div><div class="win-body" style="' + (h ? 'height:' + (h - 50) + 'px;box-sizing:border-box;' : '') + '">' + body + '</div></section>'; }
  /* 8x8 Bayer dither cover: p = 0 clear ... 1 solid */
  var BY = (function () { var m = [[0]]; while (m.length < 8) { var s = m.length, o = []; for (var y = 0; y < s * 2; y++) { o.push([]); for (var x = 0; x < s * 2; x++) o[y][x] = m[y % s][x % s] * 4 + [[0, 2], [3, 1]][Math.floor(y / s)][Math.floor(x / s)]; } m = o; } return m; })();
  function cover(p, rgb) {
    var id = dctx.createImageData(240, 135), x, y, i; p = clamp(p, 0, 1);
    for (y = 0; y < 135; y++) for (x = 0; x < 240; x++) { i = (y * 240 + x) * 4; if ((BY[y % 8][x % 8] + 0.5) / 64 < p) { id.data[i] = rgb[0]; id.data[i + 1] = rgb[1]; id.data[i + 2] = rgb[2]; id.data[i + 3] = 255; } }
    dctx.putImageData(id, 0, 0);
  }
  /* the wheel: real sky positions at `at`, ascendant turned by t */
  var posList = null, aspList = null;
  function sky() {
    if (posList) return; posList = S.positions(at).map(function (p) { return { id: p.id, lon: p.lon, retro: !!p.retro }; }); aspList = [];
    posList.forEach(function (p, i) { posList.forEach(function (r, j) { if (j <= i || p.id === 'node' || r.id === 'node') return; var sep = S.sepAbs(p.lon, r.lon);
      for (var k = 0; k < S.ASPECTS.length; k++) { var a = S.ASPECTS[k], orb = Math.abs(sep - a.angle); if (orb <= 5 * (a.angle === 60 ? 0.7 : 1)) { aspList.push({ a: p.lon, b: r.lon, ida: p.id, idb: r.id, type: a.id, orb: orb }); break; } } }); });
    aspList.sort(function (x, y) { return x.orb - y.orb; }); aspList = aspList.slice(0, 24);
  }
  function wheel(id, x, y, size, asc, alpha) {
    sky(); var c = document.getElementById(id); if (!c) { c = document.createElement('canvas'); c.id = id; c.className = 'yt-wheel'; stage.appendChild(c); }
    window.NwsChart.draw(c, { asc: asc, outer: posList, inner: null, aspects: aspList, clear: true });
    c.style.left = x + 'px'; c.style.top = y + 'px'; c.style.width = size + 'px'; c.style.height = size + 'px'; c.style.opacity = alpha === undefined ? 1 : alpha; c.style.display = size < 4 ? 'none' : '';
  }
  function typed(s, t, t0, cps) { var n = Math.floor(clamp((t - t0) * cps, 0, s.length)); return s.slice(0, n) + (n < s.length ? '<span class="yt-cur"></span>' : ''); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function black() { return [0, 0, 0]; }
  var built = false;

  var scenes = {
    intro: function (t) {
      var ts = Math.floor(t * 12) / 12;
      if (!built) { stage.innerHTML = win('w1', 1020, 400, 780, 0, 'NWS', '<div id="i-t" class="yt-big"></div><div id="i-s" class="yt-mid" style="margin-top:14px"></div>'); built = true; }
      var sc = ease((ts - 0.3) / 1.2), slide = ease((ts - 2.4) / 0.7), size = Math.round((300 + 460 * sc - 80 * slide) / 8) * 8, cx = 960 + (-700 - 0) * slide + 700 * 0 , x = Math.round((960 - size / 2) + (-420) * slide);
      wheel('wh', x, Math.round(540 - size / 2), size, 180 + ts * 40, 1);
      var w1 = document.getElementById('w1'); w1.style.display = ts > 2.8 ? '' : 'none';
      document.getElementById('i-t').innerHTML = glyph(NAMES[Math.floor(ts * 4) % 10], 84) + ' ' + typed(title.toUpperCase(), ts, 3.0, 14);
      document.getElementById('i-s').textContent = ts > 4.1 ? (sub || 'live sky instruments') : '';
      var p = ts < 1 ? 1 - ts : ts > 5.2 ? (ts - 5.2) / 0.8 : 0; cover(step(p, 16), black());
    },
    card: function (t) {
      var ts = Math.floor(t * 12) / 12;
      if (!built) { stage.innerHTML = win('c1', 360, 330, 1200, 0, 'CHAPTER ' + esc(num), '<div style="display:flex;align-items:center;gap:36px;justify-content:center"><span id="c-g"></span><div class="yt-big" id="c-t"></div></div>'); built = true; }
      document.getElementById('c-g').innerHTML = glyph(gname, 150); document.getElementById('c-t').textContent = title.toUpperCase();
      wheel('wh', 1560, 20, 300, 90 + ts * 30, 0.9);
      var p = ts < 0.6 ? 1 - ts / 0.6 : ts > 1.9 ? (ts - 1.9) / 0.6 : 0; cover(step(p, 16), black());
    },
    end: function (t) {
      var ts = Math.floor(t * 12) / 12;
      if (!built) {
        stage.innerHTML = win('e0', 160, 60, 1600, 0, 'NWS', '<div class="yt-big" id="e-t"></div>') +
          win('e1', 160, 300, 740, 480, 'VIDEO 1', '<div class="yt-slot">NEXT VIDEO</div>') + win('e2', 1020, 300, 740, 480, 'VIDEO 2', '<div class="yt-slot">MORE SKY</div>') +
          '<div class="yt-ring" id="e-sub" style="left:860px;top:820px;width:200px;height:200px;background:transparent">SUBSCRIBE</div><div id="e-bar" style="position:absolute;left:0;bottom:0;height:16px;background:var(--line,#fff)"></div>'; built = true;
      }
      document.getElementById('e-t').innerHTML = glyph(gname, 100) + ' ' + esc((q.get('title') || 'Thanks for watching').toUpperCase());
      var show = ease(ts / 1.0); ['e0', 'e1', 'e2'].forEach(function (id, i) { document.getElementById(id).style.display = ts > i * 0.25 ? '' : 'none'; });
      document.getElementById('e-sub').style.display = ts > 0.9 ? '' : 'none';
      document.getElementById('e-bar').style.width = Math.round(1920 * clamp(ts / 20, 0, 1) / 16) * 16 + 'px';
      wheel('wh', 1480, 790, 280, ts * 20, ts > 1 ? 1 : 0); document.getElementById('wh').style.zIndex = 0;
      cover(step(ts < 0.8 ? 1 - ts / 0.8 : ts > 19.3 ? (ts - 19.3) / 0.7 : 0, 16), black());
    },
    lower: function (t) {
      var ts = Math.floor(t * 12) / 12;
      if (!built) { stage.innerHTML = win('l1', 48, 790, 820, 0, 'NWS', '<div style="display:flex;align-items:center;gap:24px"><span id="l-g"></span><div><div class="yt-mid" id="l-t"></div><div class="yt-sm" id="l-s"></div></div></div>'); built = true; }
      document.getElementById('l-g').innerHTML = glyph(gname, 96); document.getElementById('l-t').textContent = title.toUpperCase(); document.getElementById('l-s').textContent = sub || 'live sky instruments';
      var inn = ease(ts / 0.6), out = ease((ts - 5.3) / 0.6), off = (1 - inn + out) * -900;
      document.getElementById('l1').style.transform = 'translateX(' + Math.round(off / 12) * 12 + 'px)';
    },
    bug: function () {
      stage.innerHTML = win('b1', 1640, 36, 244, 0, 'NWS', '<div style="display:flex;align-items:center;gap:12px;font-size:30px">' + glyph(gname, 48) + ' <span>SUBSCRIBE</span></div>');
    },
    thumb: function () {
      var words = title.toUpperCase();
      stage.innerHTML = '<div class="yt-thumb-title" id="t-t" style="left:56px;top:196px;width:640px">' + esc(words) + '</div>' +
        win('t-w', 40, 36, 0, 0, 'ON AIR', '<div style="display:flex;align-items:center;gap:14px;font-size:36px">' + glyph(gname, 56) + ' <span>' + esc(sub || 'LIVE SKY') + '</span></div>') +
        '<div class="yt-thumb-sub" style="left:60px;bottom:40px"></div>';
      wheel('wh', 700, 70, 600, 150, 1);
      var t = document.getElementById('t-t'); var fs = 150; while ((t.scrollHeight > 480 || t.scrollWidth > t.clientWidth) && fs > 60) { fs -= 6; t.style.fontSize = fs + 'px'; }
    }
  };
  window.setT = function (t) { sky(); (scenes[kind] || scenes.intro)(t); };
  var go = function () { window.setT(+q.get('t') || 0); window.ytReady = true; };
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
})();
