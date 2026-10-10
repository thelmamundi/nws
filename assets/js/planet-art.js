/* ═══════════════════════════════════════════════════════════
   PLANET ART: dithered planets with a glow that shows the planet's essential dignity, plus dithered glyph cards.
   Everything is drawn on a cell grid with an 8x8 Bayer matrix (the theme's house dither), then scaled up with hard edges.

     PlanetArt.draw(canvas, { id:'mars', n:96, cell:3, dignity:'domicile', phase:0.5, seed:1 })
        id        sun moon mercury venus mars jupiter saturn uranus neptune pluto
        dignity   domicile | exaltation | detriment | fall | peregrine | null  (null = no glow). Use AstroSky.dignity(id, signIndex).
        phase     moon only, 0..1 (0 new, .5 full)
     PlanetArt.glyph(canvas, { name:'saturn', n:96, cell:3, dignity:'fall' })      a pixel glyph with a gradient fill and the same glow
   Glow language (amber and blue are a complementary pair, so strength reads at a glance):
     domicile    big amber glow          exaltation  brightest: gold-white glow with soft rays
     detriment   blue glow, weaker       fall        small deep-blue glow, dim
     peregrine   a faint grey rim        (nothing)   no glow
═══════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var BAY = (function () { var m = [[0, 2], [3, 1]], n = 2; while (n < 8) { var q = []; for (var y = 0; y < n * 2; y++) { q.push([]); for (var x = 0; x < n * 2; x++) q[y].push(4 * m[y % n][x % n] + [[0, 2], [3, 1]][Math.floor(y / n)][Math.floor(x / n)]); } m = q; n *= 2; } return m; })();
  function bth(x, y) { return (BAY[y & 7][x & 7] + 0.5) / 64; }
  var PAL = {                                     /* four tones, dark to light */
    sun: [[120, 40, 0], [235, 110, 0], [255, 176, 0], [255, 238, 170]],
    moon: [[20, 26, 40], [78, 92, 120], [168, 182, 206], [238, 244, 255]],
    mercury: [[26, 24, 22], [86, 80, 74], [160, 152, 140], [226, 218, 204]],
    venus: [[70, 40, 8], [160, 104, 28], [232, 176, 80], [255, 233, 170]],
    mars: [[40, 10, 6], [128, 40, 20], [214, 90, 40], [255, 176, 120]],
    jupiter: [[56, 30, 12], [150, 90, 40], [222, 164, 90], [255, 228, 176]],
    saturn: [[50, 38, 14], [136, 108, 50], [214, 182, 106], [255, 238, 178]],
    uranus: [[10, 50, 70], [40, 130, 160], [110, 205, 225], [214, 248, 255]],
    neptune: [[4, 14, 70], [14, 52, 170], [58, 120, 255], [170, 208, 255]],
    pluto: [[26, 20, 24], [92, 76, 84], [170, 150, 150], [236, 220, 214]]
  };
  var GLOW = {
    domicile:   { c: [255, 176, 0],  hi: [255, 224, 120], r: 0.95, a: 1.00, rays: 0 },
    exaltation: { c: [255, 214, 110], hi: [255, 252, 232], r: 1.20, a: 1.00, rays: 1 },
    detriment:  { c: [58, 141, 255], hi: [140, 190, 255], r: 0.75, a: 0.80, rays: 0 },
    fall:       { c: [30, 62, 190],  hi: [70, 110, 230],  r: 0.50, a: 0.65, rays: 0 },
    peregrine:  { c: [120, 130, 150], hi: [170, 180, 195], r: 0.24, a: 0.45, rays: 0 }
  };
  function hash(a, b, s) { var h = (a * 374761393 + b * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, s) {                       /* value noise, wraps horizontally every 64 cells of x */
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    function h(i, j) { return hash(((i % 64) + 64) % 64, j, s); }
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
  }
  function fbm(x, y, s) { return 0.55 * vnoise(x, y, s) + 0.3 * vnoise(x * 2.1, y * 2.1, s + 3) + 0.15 * vnoise(x * 4.3, y * 4.3, s + 7); }
  /* surface feature in -1..1 at longitude u (radians) and latitude v (-1..1) */
  function feature(id, u, v, s) {
    var x = (u / 6.2832 + 0.5) * 64, f;
    switch (id) {
      case 'jupiter': f = Math.sin(v * 13 + 2.2 * fbm(x * 0.18, v * 4, s)) * 0.55 + (fbm(x * 0.6, v * 9, s + 1) - 0.5) * 0.5;
        if (Math.pow((u - 0.9) / 0.32, 2) + Math.pow((v + 0.32) / 0.1, 2) < 1) f = -0.95; return f;
      case 'saturn': return Math.sin(v * 9 + 1.2 * fbm(x * 0.2, v * 3, s)) * 0.3 + (fbm(x * 0.4, v * 6, s) - 0.5) * 0.25;
      case 'mars': f = (fbm(x * 0.35, v * 5, s) - 0.5) * 1.2; if (Math.abs(v) > 0.84) f = 1; return f;
      case 'moon': case 'mercury': f = (fbm(x * 0.7, v * 7, s) - 0.5) * 1.1; var cr = vnoise(x * 0.9, v * 9, s + 11); return cr > 0.7 ? f - 0.6 : f;
      case 'venus': return (fbm(x * 0.25 + v * 2, v * 4, s) - 0.5) * 0.55;
      case 'uranus': return (fbm(x * 0.15, v * 3, s) - 0.5) * 0.3 + (Math.abs(v) > 0.88 ? 0.4 : 0);
      case 'neptune': f = Math.sin(v * 8 + fbm(x * 0.2, v * 3, s)) * 0.3 + (fbm(x * 0.4, v * 5, s) - 0.5) * 0.4; if (Math.pow((u + 0.6) / 0.3, 2) + Math.pow((v - 0.2) / 0.12, 2) < 1) f = -0.8; return f;
      case 'pluto': f = (fbm(x * 0.5, v * 6, s) - 0.5) * 0.9; if (Math.pow((u - 0.4) / 0.45, 2) + Math.pow((v + 0.05) / 0.35, 2) < 1) f += 0.55; return f;
      case 'sun': return (fbm(x * 1.4, v * 14, s) - 0.5) * 1.1;
      default: return 0;
    }
  }
  function build(o) {
    o = o || {}; var id = PAL[o.id] ? o.id : 'moon', N = o.n || 96, cell = o.cell || 3, seed = o.seed || 7, pal = PAL[id], gl = GLOW[o.dignity] || null,
        R = N * (id === 'sun' ? 0.25 : 0.2), cx = N / 2, cy = N / 2, ring = id === 'saturn';
    if (ring) R = N * 0.17;
    var L = [-0.5, -0.55, 0.67];
    if (id === 'moon' && o.phase !== undefined) { var a = o.phase * 6.2832; L = [Math.sin(a), -0.2, -Math.cos(a)]; }
    var ln = Math.hypot(L[0], L[1], L[2]); L = [L[0] / ln, L[1] / ln, L[2] / ln];
    var buf = new Uint8ClampedArray(N * N * 4), x, y, tilt = -0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
    function put(X, Y, c, al) { var i = (Y * N + X) * 4; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = al === undefined ? 255 : al; }
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      var dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx), body = d <= R, rr = null, behind = false;
      if (ring) {                                       /* ring-plane coordinates: rotate, squash */
        var rx = dx * ct + dy * st, ry = (-dx * st + dy * ct) / 0.3; rr = Math.hypot(rx, ry) / R; behind = ry < 0;
        if (rr < 1.38 || rr > 2.15 || (rr > 1.72 && rr < 1.8)) rr = null;
      }
      if (body && !(rr && !behind)) {
        var nx = dx / R, ny = dy / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), l = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]),
            u = Math.atan2(nx, nz) + (o.rot || 0), f = feature(id, u, ny, seed), v;
        if (id === 'sun') v = 0.62 + f * 0.45 + (nz < 0.35 ? -0.12 : 0); else v = 0.04 + l * 0.9 + f * 0.22 * (0.4 + l);
        v = Math.max(0, Math.min(1, v)); var t = v * (pal.length - 1), b = Math.floor(t), q = Math.min(pal.length - 1, b + ((t - b) > bth(x, y) ? 1 : 0));
        put(x, y, pal[q]); continue;
      }
      if (rr) {                                         /* ring tone: banded, dithered; the far half is darker */
        var rv = (0.45 + 0.35 * Math.sin(rr * 26) + 0.25 * (hash(Math.floor(rr * 40), 3, seed) - 0.5)) * (behind ? 0.7 : 1); rv = Math.max(0, Math.min(1, rv));
        var rt = rv * 3, rb = Math.floor(rt), rq = Math.min(3, rb + ((rt - rb) > bth(x, y) ? 1 : 0));
        put(x, y, pal[Math.max(1, rq)]); continue;
      }
      if (gl && d > R) {                                /* dithered glow, brighter and denser close to the body */
        var span = R * gl.r, e = 1 - (d - R) / span; if (e <= 0) continue;
        var gv = gl.a * e * e; if (gl.rays) gv *= 0.7 + 0.3 * Math.pow(Math.abs(Math.cos(th * 4)), 0.6);
        if (gv > bth(x, y)) put(x, y, gv > 0.55 ? gl.hi : gl.c);
      }
    }
    return { buf: buf, N: N, cell: cell };
  }
  function draw(canvas, o) {
    var r = build(o), N = r.N, cell = r.cell;
    canvas.width = N * cell; canvas.height = N * cell;
    var off = document.createElement('canvas'); off.width = N; off.height = N;
    off.getContext('2d').putImageData(new ImageData(r.buf, N, N), 0, 0);
    var cx2 = canvas.getContext('2d'); cx2.imageSmoothingEnabled = false; cx2.clearRect(0, 0, canvas.width, canvas.height); cx2.drawImage(off, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
  /* a pixel glyph (from PixelGlyphs rect data) with a vertical dithered gradient fill and the dignity glow behind it */
  function glyph(canvas, o) {
    o = o || {}; var PG = root.PixelGlyphs, name = o.name, N = o.n || 96, cell = o.cell || 3, gl = GLOW[o.dignity] || null, S = PG.size, i, x, y;
    var bm = new Uint8Array(S * S); PG.rects(name).forEach(function (r) { for (var yy = r[1]; yy < r[1] + r[3]; yy++) for (var xx = r[0]; xx < r[0] + r[2]; xx++) bm[yy * S + xx] = 1; });
    function near(gx, gy) { for (var yy = -2; yy <= 2; yy++) for (var xx = -2; xx <= 2; xx++) { var a = gx + xx, b = gy + yy; if (a >= 0 && b >= 0 && a < S && b < S && bm[b * S + a]) return true; } return false; }   /* a 2-cell black keyline keeps the glyph crisp against the glow */
    var buf = new Uint8ClampedArray(N * N * 4), ox = Math.floor((N - S) / 2), oy = Math.floor((N - S) / 2), R = S * 0.5, cx = N / 2, cy = N / 2, top = o.top || [255, 250, 220], bot = o.bottom || [255, 176, 0];
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      var gx = x - ox, gy = y - oy, on = gx >= 0 && gy >= 0 && gx < S && gy < S && bm[gy * S + gx], d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), j = (y * N + x) * 4, c = null;
      if (on) { var tt = gy / S, k = tt > bth(x, y) ? 1 : 0; c = k ? bot : top; }
      else if (gl && !near(gx, gy)) { var e = 1 - (d - R * 0.55) / (R * gl.r * 1.6); if (e > 0) { var gv = gl.a * e * e * 0.9; if (gv > bth(x, y)) c = gv > 0.5 ? gl.hi : gl.c; } }
      if (c) { buf[j] = c[0]; buf[j + 1] = c[1]; buf[j + 2] = c[2]; buf[j + 3] = 255; }
    }
    canvas.width = N * cell; canvas.height = N * cell;
    var off = document.createElement('canvas'); off.width = N; off.height = N; off.getContext('2d').putImageData(new ImageData(buf, N, N), 0, 0);
    var c2 = canvas.getContext('2d'); c2.imageSmoothingEnabled = false; c2.clearRect(0, 0, canvas.width, canvas.height); c2.drawImage(off, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
  root.PlanetArt = { build: build, draw: draw, glyph: glyph, ids: Object.keys(PAL), dignities: Object.keys(GLOW), palette: PAL, glow: GLOW };
})(typeof self !== 'undefined' ? self : this);
