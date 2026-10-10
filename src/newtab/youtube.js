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
  var DUR = { intro: 6, end: 20, card: 2.5, lower: 6, bug: 1, thumb: 1, credits: 18, chat: 10 }; window.ytDuration = DUR[kind] || 1;
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
  var posList = null, aspList = null, skyAt = null, DAY = 86400000;
  function sky(tl) {   /* tl = days past `at` (the wheel is a time-lapse: planets and rising sign move) */
    var when = at + (tl || 0) * DAY; if (posList && skyAt === when) return; skyAt = when;
    posList = S.positions(when).map(function (p) { return { id: p.id, lon: p.lon, retro: !!p.retro }; }); aspList = [];
    posList.forEach(function (p, i) { posList.forEach(function (r, j) { if (j <= i || p.id === 'node' || r.id === 'node') return; var sep = S.sepAbs(p.lon, r.lon);
      for (var k = 0; k < S.ASPECTS.length; k++) { var a = S.ASPECTS[k], orb = Math.abs(sep - a.angle); if (orb <= 5 * (a.angle === 60 ? 0.7 : 1)) { aspList.push({ a: p.lon, b: r.lon, ida: p.id, idb: r.id, type: a.id, orb: orb }); break; } } }); });
    aspList.sort(function (x, y) { return x.orb - y.orb; }); aspList = aspList.slice(0, 24);
  }
  var NAT = null; function natal() { if (!NAT) NAT = S.positions(Date.UTC(1990, 4, 17, 18, 30)).map(function (p) { return { id: p.id, lon: p.lon, retro: !!p.retro }; }); return NAT; }
  function wheel(id, x, y, size, asc, alpha, tl) {
    sky(tl); var c = document.getElementById(id); if (!c) { c = document.createElement('canvas'); c.id = id; c.className = 'yt-wheel'; stage.appendChild(c); }
    window.NwsChart.draw(c, { asc: asc, outer: posList, inner: q.get('bi') ? natal() : null, aspects: aspList, clear: true });
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
      wheel('wh', x, Math.round(540 - size / 2), size, 180 + ts * 40, 1, ts * 4);
      var w1 = document.getElementById('w1'); w1.style.display = ts > 2.8 ? '' : 'none';
      document.getElementById('i-t').innerHTML = glyph(NAMES[Math.floor(ts * 4) % 10], 84) + ' ' + typed(title.toUpperCase(), ts, 3.0, 14);
      document.getElementById('i-s').textContent = ts > 4.1 ? (sub || 'live sky instruments') : '';
      var p = ts < 1 ? 1 - ts : ts > 5.2 ? (ts - 5.2) / 0.8 : 0; cover(step(p, 16), black());
    },
    card: function (t) {
      var ts = Math.floor(t * 12) / 12;
      if (!built) { stage.innerHTML = win('c1', 360, 330, 1200, 0, 'CHAPTER ' + esc(num), '<div style="display:flex;align-items:center;gap:36px;justify-content:center"><span id="c-g"></span><div class="yt-big" id="c-t"></div></div>'); built = true; }
      document.getElementById('c-g').innerHTML = glyph(gname, 150); document.getElementById('c-t').textContent = title.toUpperCase();
      wheel('wh', 1560, 20, 300, 90 + ts * 30, 0.9, ts * 3);
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
      wheel('wh', 1480, 790, 280, ts * 20, ts > 1 ? 1 : 0, ts * 0.6); document.getElementById('wh').style.zIndex = 0;
      cover(step(ts < 0.8 ? 1 - ts / 0.8 : ts > 19.3 ? (ts - 19.3) / 0.7 : 0, 16), black());
    },
    lower: function (t) {
      var ts = Math.floor(t * 12) / 12;
      if (!built) { stage.innerHTML = win('l1', 48, 790, 820, 0, 'NWS', '<div style="display:flex;align-items:center;gap:24px"><span id="l-g"></span><div><div class="yt-mid" id="l-t"></div><div class="yt-sm" id="l-s"></div></div></div>'); built = true; }
      document.getElementById('l-g').innerHTML = glyph(gname, 96); document.getElementById('l-t').textContent = title.toUpperCase(); document.getElementById('l-s').textContent = sub || 'live sky instruments';
      var inn = ease(ts / 0.6), out = ease((ts - 5.3) / 0.6), off = (1 - inn + out) * -900;
      document.getElementById('l1').style.transform = 'translateX(' + Math.round(off / 12) * 12 + 'px)';
    },
    credits: function (t) {
      var ts = Math.floor(t * 12) / 12, rows = (q.get('credits') || 'Hosted by:Your Name;Sky data:NWS astro engine;Charts:NWS;Music:Track name;Edited by:Your Name;Special thanks:Everyone who watched').split(';');
      if (!built) {
        var list = '<div class="yt-mid" style="text-align:center;margin-bottom:90px">' + esc(title.toUpperCase()) + '</div>' + rows.map(function (r) { var a = r.split(':'); return '<div style="text-align:center;margin-bottom:56px"><div class="yt-sm" style="opacity:.7">' + esc((a[0] || '').toUpperCase()) + '</div><div class="yt-mid">' + esc(a.slice(1).join(':')) + '</div></div>'; }).join('') + '<div style="text-align:center;margin:90px 0 400px">' + glyph(gname, 96) + '<div class="yt-sm" style="margin-top:14px">THANKS FOR WATCHING</div></div>';
        stage.innerHTML = '<section class="win" style="left:510px;top:30px;width:900px;height:1020px"><div class="win-title"><span class="win-name">CREDITS</span></div><div class="win-body" style="height:970px;overflow:hidden;box-sizing:border-box;padding:0"><div id="cr" style="padding:0 40px">' + list + '</div></div></section>'; built = true;
      }
      var el = document.getElementById('cr'), tot = el.offsetHeight + 970, y = 970 - Math.round(ts / 18 * tot / 6) * 6;
      el.style.transform = 'translateY(' + y + 'px)';
      wheel('wh', 70, 330, 380, 40 + ts * 20, 1, ts * 2); wheel('wh2', 1470, 330, 380, 200 - ts * 20, 1, 400 + ts * 2);
      cover(step(ts < 0.8 ? 1 - ts / 0.8 : ts > 17.3 ? (ts - 17.3) / 0.7 : 0, 16), black());
    },
    chat: function (t) {
      var ts = Math.floor(t * 12) / 12, M = [['moonlight_k', 'mercury retrograde AGAIN??', 0], ['saturn_return_sam', 'pluto never lost anything', 1], ['venus_taste', 'ok the wheel is so pretty', 2], ['n0de_north', 'what house is that in', 3], ['mars_in_leo', 'LOL the hot take section', 4], ['moonlight_k', 'asking for my chart', 5], ['chiron_chris', 'new moon in 1h 20m!!', 6], ['venus_taste', 'the little planet buttons omg', 7], ['jupiter_jo', 'can u do synastry next', 8], ['saturn_return_sam', 'this ticker is hypnotic', 9]], C = ['var(--led,#ff9a3a)', 'var(--ledg,#7dffa0)', 'var(--cyan,#7aa0ff)', 'var(--pink,#ffa0ff)', 'var(--redc,#ff8a8a)'];
      if (!built) {
        sky(0); var tk = posList.filter(function (p) { return p.id !== 'node'; }).map(function (p) { var o = S.positions(at).filter(function (z) { return z.id === p.id; })[0]; return o.glyph + ' ' + o.deg + '\u00B0' + o.min + "' " + o.signGlyph + (o.retro ? ' \u211E' : ''); }).join('    ');
        stage.innerHTML = win('ch-s', 16, 16, 1390, 940, 'MAIN SCREEN', '<div class="yt-slot" style="font-size:48px">GAME / SCREEN SHARE</div>') + win('ch-c', 1422, 16, 482, 270, 'CAM', '<div class="yt-slot">FACE CAM</div>') +
          win('ch-t', 1422, 302, 482, 654, 'LIVE CHAT', '<div id="ch-l" style="height:100%;display:flex;flex-direction:column;justify-content:flex-end;gap:10px;overflow:hidden;font-size:24px;line-height:1.15"></div>') +
          '<div class="onair" style="position:absolute;left:16px;right:16px;top:972px;height:70px;overflow:hidden;display:flex;align-items:center;font-size:30px;white-space:nowrap"><span class="onair-sign" style="align-self:stretch;display:flex;align-items:center;padding:0 14px"><span class="lamp"></span>ON AIR</span><div style="flex:1;overflow:hidden;align-self:center"><span id="ch-k" style="padding-left:24px;display:inline-block">' + tk + '</span></div></div>'; built = true;
        var sw = document.getElementById('ch-s'); sw.querySelector('.win-name').textContent = title.toUpperCase();
      }
      var n = Math.min(M.length, Math.floor(ts / 0.9) + 1), html = '';
      for (var i = Math.max(0, n - 9); i < n; i++) html += '<div><span style="color:' + C[(M[i][0].length + i) % 5] + '">' + esc(M[i][0]) + '</span>: ' + esc(M[i][1]) + '</div>';
      document.getElementById('ch-l').innerHTML = html;
      document.getElementById('ch-k').style.transform = 'translateX(' + (-Math.round(ts * 60 / 6) * 6) + 'px)';
      cover(step(ts < 0.6 ? 1 - ts / 0.6 : 0, 16), black());
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
