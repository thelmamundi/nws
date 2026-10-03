/* ═══════════════════════════════════════════════════════════
   ART: bitmap dithering + ASCII, both driven by the active theme's colours.

   <div data-art="orb|moon" data-size="200">    procedural shaded sphere, drawn as a 1-bit Bayer-dithered bitmap
                                                or as ASCII (the BITMAP/ASCII switch in the dock decides)
   <img class="dither" src="..." alt="...">      any image becomes a 1-bit ordered-dither bitmap (or ASCII in ASCII mode)

   Ink = --hi, paper = --bg. On a light theme (paper) the ramp is flipped so shadows are ink, like a print.
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var RAMP = ' .\'`^",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
  var BAY = (function bayer(n) {                                 /* 8x8 ordered-dither matrix, 0..63 */
    var m = [[0]];
    while (m.length < n) {
      var s = m.length, o = [], y, x;
      for (y = 0; y < s * 2; y++) { o[y] = []; for (x = 0; x < s * 2; x++) { var b = m[y % s][x % s] * 4; o[y][x] = b + [[0, 2], [3, 1]][y >= s ? 1 : 0][x >= s ? 1 : 0] * 1; } }
      m = o;
    }
    return m;
  })(8);

  function mode() { try { return localStorage.getItem('nws-art') === 'ascii' ? 'ascii' : 'bitmap'; } catch (e) { return 'bitmap'; } }
  function cssv(n) { return getComputedStyle(root).getPropertyValue(n).trim(); }
  function hex(c) { c = c.replace('#', ''); if (c.length === 3) c = c.replace(/./g, '$&$&'); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function lumOf(rgb) { return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255; }
  function palette() { var bg = hex(cssv('--bg')), ink = hex(cssv('--hi')); return { bg: bg, ink: ink, flip: lumOf(bg) > lumOf(ink) }; }

  /* ── tiny value noise for planet texture ── */
  function h2(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return (h2(xi, yi) * (1 - u) + h2(xi + 1, yi) * u) * (1 - v) + (h2(xi, yi + 1) * (1 - u) + h2(xi + 1, yi + 1) * u) * v;
  }
  function fbm(x, y) { return vnoise(x, y) * .55 + vnoise(x * 2.1, y * 2.1) * .3 + vnoise(x * 4.3, y * 4.3) * .15; }

  /* ── scenes: f(u, v, t) -> brightness 0..1, or -1 for empty paper. u, v in [-1, 1] ── */
  var SCENES = {
    orb: function (u, v, t) {                                           /* banded, ringed planet */
      u *= 1.7; v *= 1.7;
      var r2 = u * u + v * v, ring = 0, yy = v / 0.28, rr = Math.sqrt(u * u + yy * yy);
      if (rr > 1.28 && rr < 1.62 && !(rr > 1.46 && rr < 1.5)) ring = 0.55 + 0.25 * Math.sin(rr * 40);
      if (r2 > 1) return ring ? ring : -1;
      var z = Math.sqrt(1 - r2), lon = Math.atan2(u, z) + t, lat = Math.asin(v);
      var band = 0.5 + 0.3 * Math.sin(lat * 14 + fbm(lon * 2, lat * 3) * 4), tex = fbm(lon * 3, lat * 5) * .5 + band * .5;
      var L = [-0.55, -0.45, 0.7], ln = Math.sqrt(L[0] * L[0] + L[1] * L[1] + L[2] * L[2]);
      var d = Math.max(0, (u * L[0] + v * L[1] + z * L[2]) / ln);
      if (v > 0 && ring) return ring;                                     /* front of the ring crosses the disc */
      return Math.min(1, 0.06 + d * (0.55 + tex * 0.6));
    },
    moon: function (u, v, t, o) {                                       /* the Moon at the real phase */
      u *= 1.08; v *= 1.08;
      var r2 = u * u + v * v;
      if (r2 > 1) return -1;
      var k = ((o && o.elong) || 0) * Math.PI / 180, z = Math.sqrt(1 - r2);
      var d = Math.max(0, u * Math.sin(k) + z * -Math.cos(k));
      var c = fbm(u * 5 + 3, v * 5 + 1), maria = c > 0.52 ? 0.62 : 1;
      var crater = vnoise(u * 14, v * 14) > 0.86 ? 0.8 : 1;
      var rim = r2 > 0.93 ? 0.35 : 0;                                      /* faint earthshine edge */
      return Math.min(1, Math.max(rim, 0.03 + d * 0.95 * maria * crater));
    }
  };

  /* ── renderers: field -> bitmap (canvas) or ASCII (pre) ── */
  function bitmap(host, fn, size, cell, p) {
    var cv = host._cv; if (!cv) { cv = host._cv = doc.createElement('canvas'); cv.className = 'dithered art'; host.innerHTML = ''; host.appendChild(cv); }
    var n = Math.round(size / cell); cv.width = n; cv.height = n; cv.style.width = n * cell + 'px'; cv.style.height = n * cell + 'px';
    var x = cv.getContext('2d'), img = x.createImageData(n, n), d = img.data, i = 0, X, Y;
    for (Y = 0; Y < n; Y++) for (X = 0; X < n; X++, i += 4) {
      var l = fn(X / (n - 1) * 2 - 1, Y / (n - 1) * 2 - 1), on = false;
      if (l >= 0) { var th = (BAY[Y & 7][X & 7] + 0.5) / 64; on = p.flip ? (1 - l) > th : l > th; }
      var c = on ? p.ink : p.bg; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  }
  function ascii(host, fn, cols, p) {
    var rows = Math.round(cols * 0.5), pre = host._pre; if (!pre) { pre = host._pre = doc.createElement('pre'); pre.className = 'ascii'; host.innerHTML = ''; host.appendChild(pre); }
    var out = '', X, Y;
    for (Y = 0; Y < rows; Y++) {
      for (X = 0; X < cols; X++) {
        var l = fn(X / (cols - 1) * 2 - 1, Y / (rows - 1) * 2 - 1);
        if (l < 0) { out += ' '; continue; }
        var q = p.flip ? 1 - l : l; out += RAMP.charAt(Math.min(RAMP.length - 1, Math.floor(q * (RAMP.length - 1) + 0.5)));
      }
      out += '\n';
    }
    pre.textContent = out;
  }

  /* ── procedural art hosts ── */
  var hosts = [];
  function frame(host, t) {
    var o = {}, size = +host.getAttribute('data-size') || 200, scene = host.getAttribute('data-art');
    if (scene === 'moon' && window.AstroSky) o.elong = window.AstroSky.moonPhase(Date.now()).elong;
    var fn = function (u, v) { return SCENES[scene](u, v, t, o); }, p = palette(), m = mode();
    host.removeAttribute('data-mode'); host.setAttribute('data-mode', m);
    if (m === 'ascii') { if (host._cv) { host._cv = null; } ascii(host, fn, Math.round(size / 8), p); }
    else { if (host._pre) { host._pre = null; } bitmap(host, fn, size, +host.getAttribute('data-cell') || 3, p); }
  }
  var last = 0;
  function loop(ts) {
    if (!doc.hidden && ts - last > 140) {                              /* ~7fps: chunky on purpose */
      last = ts;
      hosts.forEach(function (h) { if (h.getAttribute('data-spin') !== null) frame(h, ts / 4000); });
    }
    requestAnimationFrame(loop);
  }
  function redraw() { hosts.forEach(function (h) { frame(h, h._t0 || 0.6); }); redithers(); }

  /* ── <img class="dither"> ── */
  function dither(img) {
    var box = img.parentNode, w = Math.round(box.clientWidth || img.clientWidth || 160), cell = +img.getAttribute('data-cell') || 2;
    var src = new Image(); src.crossOrigin = 'anonymous';
    src.onload = function () {
      try {
        var cw = Math.ceil(w / cell), ch = Math.round(cw * src.height / src.width), off = doc.createElement('canvas'); off.width = cw; off.height = ch;
        var x = off.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, cw, ch);
        var px = x.getImageData(0, 0, cw, ch).data, L = [], i, X, Y;
        for (i = 0; i < px.length; i += 4) L.push((0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255);
        var fn = function (u, v) { var X2 = Math.round((u + 1) / 2 * (cw - 1)), Y2 = Math.round((v + 1) / 2 * (ch - 1)); return Math.min(1, Math.max(0, (L[Y2 * cw + X2] - 0.5) * 1.2 + 0.5)); };
        var host = img._host; if (!host) { host = img._host = doc.createElement('div'); host.className = 'dither-host'; img.parentNode.insertBefore(host, img); img.style.display = 'none'; }
        var p = palette();
        if (mode() === 'ascii') ascii(host, fn, Math.min(80, Math.round(w / 8)), p);
        else {
          var cv = host._cv || (host._cv = doc.createElement('canvas')); cv.className = 'dithered'; cv.width = cw; cv.height = ch; cv.style.width = cw * cell + 'px'; cv.style.height = ch * cell + 'px';
          if (!cv.parentNode) { host.innerHTML = ''; host.appendChild(cv); }
          var g = cv.getContext('2d'), im = g.createImageData(cw, ch), d = im.data, k = 0;
          for (Y = 0; Y < ch; Y++) for (X = 0; X < cw; X++, k += 4) {
            var l = L[Y * cw + X]; l = Math.min(1, Math.max(0, (l - 0.5) * 1.2 + 0.5));
            var th = (BAY[Y & 7][X & 7] + 0.5) / 64, on = p.flip ? (1 - l) > th : l > th, c = on ? p.ink : p.bg;
            d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
          }
          g.putImageData(im, 0, 0);
        }
        host.setAttribute('role', 'img'); host.setAttribute('aria-label', img.getAttribute('alt') || '');
      } catch (e) { img.style.display = ''; }                         /* tainted canvas: keep the original */
    };
    src.src = img.currentSrc || img.src;
  }
  function redithers() { Array.prototype.forEach.call(doc.querySelectorAll('img.dither'), function (i) { if (i.complete) dither(i); }); }

  function init() {
    hosts = Array.prototype.slice.call(doc.querySelectorAll('[data-art]'));
    redraw();
    Array.prototype.forEach.call(doc.querySelectorAll('img.dither'), function (i) { i.addEventListener('load', function () { dither(i); }); });
    if (!REDUCED) requestAnimationFrame(loop);
  }
  window.addEventListener('themechange', redraw); window.addEventListener('artmode', redraw);
  window.NwsArt = { redraw: redraw, mode: mode };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
